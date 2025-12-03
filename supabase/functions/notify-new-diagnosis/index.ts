// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// --- CONFIG ---
const POSTMARK_SERVER_TOKEN = Deno.env.get('POSTMARK_SERVER_TOKEN')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || "noreply@byteclinic.pl";
const FROM_NAME = Deno.env.get('FROM_NAME') || "ByteClinic";
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')!;
const POSTMARK_ENDPOINT = 'https://api.postmarkapp.com/email';

// --- Helper: skrócone ID ---
const shortId = (id: string) => id?.slice(0, 8) || id;

// --- SEND EMAIL VIA POSTMARK ---
async function sendEmail(to: string, subject: string, html: string) {
  const emailData = {
    From: `${FROM_NAME} <${FROM_EMAIL}>`,
    To: to,
    Subject: subject,
    HtmlBody: html,
    ReplyTo: 'kontakt@byteclinic.pl',
    Tag: 'new-diagnosis',
    TrackOpens: true,
    TrackLinks: 'HtmlOnly'
  };

  const res = await fetch(POSTMARK_ENDPOINT, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
    },
    body: JSON.stringify(emailData),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.log("Postmark ERROR:", res.status, errorText);
    throw new Error(`Postmark email error: ${res.statusText}`);
  }

  const result = await res.json();
  console.log("Postmark SUCCESS:", result.MessageID, "to:", to);
  return result;
}

// --- HTTP HANDLER ---
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const record = body?.record;

    if (!record || !record.id) {
      return new Response("Missing record in payload", { status: 400 });
    }

    // Extract fields
    const id = shortId(record.id);
    const name = record.name || "Nie podano";
    const email = record.email || "Brak";
    const phone = record.phone || "Brak";
    const device = record.device || "N/A";
    const message = record.message || "Brak treści";
    const createdAt = record.created_at || new Date().toISOString();

    // Email content (HTML)
    const html = `
      <h2>🔔 Nowe zgłoszenie #${id}</h2>
      <p><b>Data:</b> ${createdAt}</p>

      <h3>👤 Klient</h3>
      <p><b>Imię i nazwisko:</b> ${name}<br/>
      <b>Email:</b> ${email}<br/>
      <b>Telefon:</b> ${phone}</p>

      <h3>💻 Urządzenie</h3>
      <p>${device}</p>

      <h3>📝 Opis problemu</h3>
      <p>${message}</p>

      <hr/>
      <p>Panel administracyjny: <a href="https://byteclinic.pl/admin/tickets">Kliknij tutaj</a></p>
    `;

    const subject = `🔔 Nowe zgłoszenie #${id} - ${device}`;

    // Send email
    await sendEmail(ADMIN_EMAIL, subject, html);

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Email sent successfully",
      id: id 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(error) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
