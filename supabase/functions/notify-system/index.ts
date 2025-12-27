import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'serwis@byteclinic.pl';
const FALLBACK_ADMIN_EMAIL = Deno.env.get('FALLBACK_ADMIN_EMAIL') || 'kontakt@byteclinic.pl'; // Fallback if primary admin email fails
const PROCESS_PENDING_NOTIFICATIONS_URL = `${SUPABASE_URL}/functions/v1/process-pending-notifications`;

// Szablony które wymagają fallback admin email (ważne zgłoszenia)
const CRITICAL_TEMPLATES = ['repair_request', 'complaint', 'urgent_support'];

console.log('🔧 notify-system starting with ADMIN_EMAIL:', ADMIN_EMAIL);
console.log('🔧 Fallback admin email:', FALLBACK_ADMIN_EMAIL);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
};

type TemplateRenderer = {
  subject: (data: Record<string, any>) => string;
  html: (data: Record<string, any>) => string;
  alwaysSendAdminCopy?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  new_request: 'Nowe zgłoszenie',
  open: 'Otwarte',
  waiting_for_parts: 'Oczekiwanie na części',
  in_repair: 'W trakcie naprawy',
  repair_completed: 'Naprawa zakończona',
  ready_for_pickup: 'Gotowe do odbioru',
  received: 'Przyjęte',
  diagnosed: 'Zdiagnozowane',
  in_progress: 'W trakcie naprawy',
  testing: 'Testowanie',
  completed: 'Naprawa zakończona',
  ready: 'Gotowe do odbioru'
};

const TEMPLATE_RENDERERS: Record<string, TemplateRenderer> = {
  booking_confirmation: {
    subject: (data) => `✅ Potwierdzenie rezerwacji ${data.bookingId ? `#${data.bookingId}` : ''} - ByteClinic`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background:#f8fafc;">
        <h1 style="margin: 0 0 18px 0;">Potwierdzenie rezerwacji</h1>
        <p>Cześć ${data.name || 'Kliencie'}, dziękujemy za rezerwację usługi w ByteClinic.</p>
        <ul>
          <li><strong>Usługa:</strong> ${data.service || 'Serwis'}</li>
          <li><strong>Data:</strong> ${data.date || '---'} | <strong>Godzina:</strong> ${data.time || '---'}</li>
          <li><strong>Czas trwania:</strong> ${data.duration || 60} minut</li>
          <li><strong>Urządzenie:</strong> ${data.device || 'Nie podano'}</li>
        </ul>
        <p>Numer rezerwacji: <strong>${data.bookingId || '---'}</strong></p>
        <p>W razie pytań zadzwoń: <strong>+48 724 316 523</strong></p>
      </div>
    `
  },
  repair_request: {
    subject: (data) => `🔧 Nowe zgłoszenie naprawcze ${data.device ? `- ${data.device}` : ''}`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background:#fffbea;">
        <h1 style="margin: 0 0 18px 0;">Nowe zgłoszenie naprawcze</h1>
        <p><strong>Klient:</strong> ${data.name || 'Nieznany'} (${data.email || 'brak email'})</p>
        <p><strong>Telefon:</strong> ${data.phone || 'brak'}</p>
        <p><strong>Urządzenie:</strong> ${data.device || 'Nie podano'}</p>
        <p><strong>Opis:</strong><br/>${data.message || 'Brak opisu'}</p>
        <p>ID zgłoszenia: <strong>${data.id || data.requestId || '---'}</strong></p>
      </div>
    `,
    alwaysSendAdminCopy: true
  },
  repair_status_update: {
    subject: (data) => {
      const statusLabel = getStatusLabel(data.status);
      return `🔧 Aktualizacja naprawy ${data.repairId ? `#${data.repairId}` : ''} - ${statusLabel}`;
    },
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background:#f1f5f9;">
        <h1 style="margin: 0 0 12px 0;">Status naprawy</h1>
        <p>Numer zlecenia: <strong>${data.repairId || '---'}</strong></p>
        <p>Aktualny status: <strong>${getStatusLabel(data.status)}</strong></p>
        <p>Postęp: <strong>${data.progress ?? 0}%</strong></p>
        ${data.notes ? `<p>Notatka technika:<br/>${data.notes}</p>` : ''}
        <p>Urządzenie: ${data.device || 'Nie podano'}</p>
      </div>
    `
  },
  repair_ready: {
    subject: (data) => `🎉 Naprawa ${data.repairId ? `#${data.repairId} ` : ''}gotowa do odbioru`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background:#ecfdf5;">
        <h1 style="margin: 0 0 12px 0;">Twoje urządzenie jest gotowe!</h1>
        <p>Numer zlecenia: <strong>${data.repairId || '---'}</strong></p>
        <p>Zapraszamy po odbiór do serwisu ByteClinic.</p>
        <p>Urządzenie: ${data.device || 'Nie podano'}</p>
      </div>
    `
  },
  appointment_reminder: {
    subject: (data) => `⏰ Przypomnienie o wizycie ${data.date || ''} ${data.time || ''}`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background:#fef3c7;">
        <h1 style="margin: 0 0 12px 0;">Przypomnienie o wizycie</h1>
        <p>Spotykamy się <strong>${data.date || 'dzisiaj'}</strong> o <strong>${data.time || 'ustalonej godzinie'}</strong>.</p>
        <p>Usługa: ${data.service || 'Serwis ByteClinic'}</p>
        <p>Numer rezerwacji: ${data.bookingId || '---'}</p>
      </div>
    `
  },
  email_confirmation: {
    subject: () => '✅ Potwierdź swój adres e-mail - ByteClinic',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background:#e0f2fe;">
        <h1 style="margin: 0 0 12px 0;">Potwierdzenie adresu email</h1>
        <p>Kliknij poniższy przycisk aby aktywować konto:</p>
        <p><a href="${data.confirmationUrl || '#'}" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;">Potwierdź email</a></p>
      </div>
    `
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json();

    const hasRawContent = typeof body?.subject === 'string' && typeof body?.html === 'string';
    const templateKey = (body?.template || (hasRawContent ? 'custom' : '')).toLowerCase();
    const renderer = hasRawContent ? null : TEMPLATE_RENDERERS[templateKey];

    if (!hasRawContent && !renderer) {
      return new Response(JSON.stringify({ success: false, error: 'Nieznany template powiadomienia' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = body.data || {};
    const subject = hasRawContent ? body.subject : renderer!.subject(data);
    const html = hasRawContent ? body.html : renderer!.html(data);

    const primaryRecipient = body.recipient || data.email || (!hasRawContent && renderer!.alwaysSendAdminCopy ? ADMIN_EMAIL : null);

    if (!primaryRecipient) {
      return new Response(JSON.stringify({ success: false, error: 'Brak odbiorcy powiadomienia' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const notifications = [];
    const metadata = {
      template: templateKey,
      cc: body.cc || null,
      bcc: body.bcc || null,
      request_id: data.requestId || data.request_id || null,
      booking_id: data.bookingId || data.booking_id || null,
      repair_id: data.repairId || data.repair_id || null,
      user_id: data.userId || data.user_id || null,
      source: 'notify-system',
      ...((body?.metadata && typeof body.metadata === 'object') ? body.metadata : {})
    };

    notifications.push(await insertNotification({
      template: templateKey,
      recipientEmail: primaryRecipient,
      recipientName: data.name || data.customerName || null,
      subject,
      html,
      data,
      metadata
    }));

    const shouldSendAdminCopy = body.sendAdminCopy || (!hasRawContent && renderer!.alwaysSendAdminCopy);
    if (shouldSendAdminCopy && primaryRecipient !== ADMIN_EMAIL) {
      console.log('📧 Sending admin copy to:', ADMIN_EMAIL);
      notifications.push(await insertNotification({
        template: templateKey,
        recipientEmail: ADMIN_EMAIL,
        recipientName: 'ByteClinic Admin',
        subject: `[ADMIN] ${subject}`,
        html,
        data,
        metadata: { ...metadata, original_recipient: primaryRecipient, admin_copy: true }
      }));
      
      // Opcjonalnie: wyślij również do fallback email dla krytycznych zgłoszeń
      if (CRITICAL_TEMPLATES.includes(templateKey) && FALLBACK_ADMIN_EMAIL !== ADMIN_EMAIL) {
        console.log('📧 Sending fallback admin copy to:', FALLBACK_ADMIN_EMAIL);
        notifications.push(await insertNotification({
          template: templateKey,
          recipientEmail: FALLBACK_ADMIN_EMAIL,
          recipientName: 'ByteClinic Admin (Fallback)',
          subject: `[ADMIN-FALLBACK] ${subject}`,
          html,
          data,
          metadata: { ...metadata, original_recipient: primaryRecipient, admin_copy: true, is_fallback: true }
        }));
      }
    }

    const processor = await maybeTriggerProcessor(
      body?.processNow,
      notifications.map((n: any) => n?.notification_id).filter(Boolean),
    );

    return new Response(JSON.stringify({ success: true, notifications, processor }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('notify-system error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function maybeTriggerProcessor(processNow: unknown, notificationIds: string[]) {
  if (processNow === false) {
    return { triggered: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(PROCESS_PENDING_NOTIFICATIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'notify-system', notification_ids: notificationIds }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { triggered: true, ok: false, status: response.status, error: text || response.statusText };
    }

    const json = await response.json().catch(() => null);
    return { triggered: true, ok: true, result: json };
  } catch (error: any) {
    return { triggered: true, ok: false, error: error?.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function insertNotification(payload: {
  template: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  html: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  const notification_id = generateNotificationId();
  const text_content = stripHtml(payload.html);

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      notification_id,
      type: payload.template,
      recipient_email: payload.recipientEmail,
      recipient_name: payload.recipientName,
      subject: payload.subject,
      html_content: payload.html,
      text_content,
      data: payload.data,
      status: 'pending',
      metadata: payload.metadata || null
    })
    .select('id, notification_id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function getStatusLabel(status?: string) {
  if (!status) return 'Aktualizacja';
  const normalized = status.toLowerCase();
  return STATUS_LABELS[normalized] || status;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function generateNotificationId() {
  const random = crypto.randomUUID().split('-')[0];
  return `notif_${Date.now()}_${random}`;
}
