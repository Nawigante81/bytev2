// Edge Function: notify-comment-or-status
// Purpose: Send email notifications when a new ticket comment is added
// or when diagnosis status is changed.
//
// Configure secrets (Supabase Dashboard -> Edge Functions -> Secrets):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - RESEND_API_KEY (or replace sendEmail implementation with your provider)
// - MAIL_FROM (e.g. "ByteClinic <no-reply@domain>")
//
// To wire events, use Database Webhooks in the Supabase dashboard:
// - ticket_comments: on INSERT -> POST to this function URL
// - diagnosis_requests: on UPDATE (only column 'status') -> POST to this function URL
// Payload should be JSON with fields { type: string, record: object, old_record?: object }

// @deno-types="https://esm.sh/@supabase/supabase-js@2.45.4/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Simple Resend email sender
async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM') || 'no-reply@example.com';
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    const b = await res.text();
    throw new Error(`Resend error: ${res.status} ${b}`);
  }
}

function shortId(id: string) {
  try { return id?.slice(0, 8); } catch { return String(id); }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = await req.json();
    // Supabase DB Webhooks send { type: 'INSERT'|'UPDATE'|..., table: '...', record, old_record }
    const rawType = body?.type as string | undefined;
    const table = body?.table as string | undefined;
    const record = body?.record ?? {};
    const old_record = body?.old_record ?? {};

    // Normalize event to our internal names
    let type = body?.event as string | undefined;
    if (!type && rawType && table) {
      if (rawType === 'INSERT' && table === 'ticket_comments') type = 'ticket_comment_insert';
      if (rawType === 'UPDATE' && table === 'diagnosis_requests') type = 'diagnosis_status_update';
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

    const sclient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Helper resolving recipient and human-readable info for a ticket
    async function resolveTicketRecipient(ticketId: string): Promise<{ to: string | null; device: string | null; }> {
      const { data, error } = await sclient
        .from('diagnosis_requests')
        .select('id, device, email, user_id')
        .eq('id', ticketId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { to: null, device: null };

      // Prefer email z rekordu, fallback na auth.users.email
      if (data.email) return { to: data.email, device: data.device };
      if (data.user_id) {
        const { data: u, error: uerr } = await sclient
          .from('profiles')
          .select('id')
          .eq('id', data.user_id)
          .maybeSingle();
        if (uerr) console.warn('profiles check error:', uerr.message);
        // Using auth schema requires service role and rpc, but email is in auth.users.
        // Use admin API with service role via the auth.users view is not exposed by postgrest.
        // Alternative: rely on diagnosis_requests.email when possible.
      }
      return { to: null, device: data.device };
    }

    if (type === 'ticket_comment_insert') {
      const ticketId = record?.ticket_id as string;
      const bodyText = String(record?.body ?? '');
      const { to, device } = await resolveTicketRecipient(ticketId);
      if (!to) return new Response('No recipient email found', { status: 200 });

      const subject = `Nowy komentarz do zgłoszenia #${shortId(ticketId)}`;
      const text = `Dodano nowy komentarz do Twojego zgłoszenia\n\n` +
        `Zgłoszenie: ${device ?? ticketId}\n` +
        `Treść: ${bodyText}\n\n` +
        `Podgląd: ${new URL(`/ticket/${ticketId}`, req.url).toString()}`;

      await sendEmail(to, subject, text);
      return new Response('ok', { status: 200 });
    }

    if (type === 'diagnosis_status_update') {
      const ticketId = record?.id as string;
      const newStatus = String(record?.status);
      const oldStatus = String(old_record?.status);
      if (!ticketId || !newStatus || newStatus === oldStatus) return new Response('noop', { status: 200 });

      const { to, device } = await resolveTicketRecipient(ticketId);
      if (!to) return new Response('No recipient email found', { status: 200 });

      const subject = `Zmiana statusu zgłoszenia #${shortId(ticketId)} -> ${newStatus}`;
      const text = `Status Twojego zgłoszenia został zmieniony.\n\n` +
        `Zgłoszenie: ${device ?? ticketId}\n` +
        `Nowy status: ${newStatus}\n\n` +
        `Podgląd: ${new URL(`/ticket/${ticketId}`, req.url).toString()}`;

      await sendEmail(to, subject, text);
      return new Response('ok', { status: 200 });
    }

    return new Response('Unhandled type', { status: 200 });
  } catch (e) {
    console.error('notify error:', e?.message || e);
    return new Response(`Error: ${e?.message || e}`, { status: 500 });
  }
});
