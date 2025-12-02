// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// --- CONFIG ---
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const MAIL_FROM = Deno.env.get('MAIL_FROM') || "ByteClinic <no-reply@byteclinic.pl>";
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')!;

// --- Helper: skrócone ID ---
const shortId = (id: string) => id?.slice(0, 8) || id;

// --- SEND EMAIL ---
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.log("Resend ERROR:", res.status, await res.text());
    throw new Error("Resend email error");
  }

  return res.json();
}

// --- HTTP HANDLER ---
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

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

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
