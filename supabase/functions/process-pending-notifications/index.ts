import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const MAIL_FROM = Deno.env.get('MAIL_FROM') || 'onboarding@resend.dev';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface Notification {
  id: string;
  notification_id: string;
  recipient_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  retry_count: number;
  max_retries: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting pending notifications processor...');

    const body = await req.json().catch(() => ({}));
    const rawIds = (body?.notification_ids ?? body?.notification_id ?? []) as unknown;
    const notificationIds = Array.isArray(rawIds) ? rawIds : [rawIds];
    const ids = notificationIds
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    // Pobierz wszystkie powiadomienia w statusie 'pending'
    const query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3) // Maksymalnie 3 próby
      .order('created_at', { ascending: true })
      .limit(50); // Przetwarzaj max 50 na raz

    const { data: pendingNotifications, error: fetchError } = ids.length > 0
      ? await query.in('notification_id', ids)
      : await query;

    if (fetchError) {
      throw new Error(`Error fetching notifications: ${fetchError.message}`);
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('✅ No pending notifications to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending notifications',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Found ${pendingNotifications.length} pending notifications`);

    const results = {
      total: pendingNotifications.length,
      sent: 0,
      failed: 0,
      details: [] as any[]
    };

    // Przetwarzaj każde powiadomienie Z OPÓŹNIENIEM (rate limit: 2 req/sec)
    for (const notification of pendingNotifications as Notification[]) {
      try {
        console.log(`📤 Sending notification ${notification.notification_id} to ${notification.recipient_email}`);

        // Wyślij email przez Resend
        if (!RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY is not configured');
        }

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: MAIL_FROM,
            to: notification.recipient_email,
            subject: notification.subject,
            html: notification.html_content,
            text: notification.text_content || undefined,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          throw new Error(`Resend API error: ${resendResponse.status} - ${errorText}`);
        }

        const resendData = await resendResponse.json();
        console.log(`✅ Email sent successfully: ${notification.notification_id}`, resendData);

        // Zaktualizuj status na 'sent'
        const { error: updateError } = await supabaseAdmin
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              ...((notification as any).metadata || {}),
              resend_id: resendData.id,
              sent_by_processor: true
            }
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`⚠️ Failed to update notification status:`, updateError);
        }

        results.sent++;
        results.details.push({
          notification_id: notification.notification_id,
          status: 'sent',
          recipient: notification.recipient_email
        });

      } catch (error: any) {
        console.error(`❌ Failed to send notification ${notification.notification_id}:`, error);

        // Zaktualizuj status na 'failed' i zwiększ retry_count
        const { error: updateError } = await supabaseAdmin
          .from('notifications')
          .update({
            status: notification.retry_count + 1 >= notification.max_retries ? 'failed' : 'pending',
            error_message: error.message || String(error),
            retry_count: notification.retry_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`⚠️ Failed to update notification status:`, updateError);
        }

        results.failed++;
        results.details.push({
          notification_id: notification.notification_id,
          status: 'failed',
          recipient: notification.recipient_email,
          error: error.message
        });
      }

      // 🚀 Opóźnienie 600ms między emailami dla rate limit (Resend Free: 2 req/sec)
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    console.log(`✅ Processing complete: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Process pending notifications error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
