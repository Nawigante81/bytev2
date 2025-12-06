// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Declare Deno global for TypeScript
declare const Deno: any;

// --- CONFIG ---
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@byteclinic.pl';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// --- Helper: skrócone ID ---
const shortId = (id: string) => id?.slice(0, 8) || id;

// --- SEND EMAIL VIA SUPABASE ---
async function sendEmail(to: string, subject: string, html: string, record: any) {
  // Create notification record in database
  const notificationData = {
    type: 'repair_request',
    recipient_email: to,
    subject: subject,
    html_content: html,
    status: 'pending',
    metadata: {
      record_id: record.id,
      request_id: record.request_id || null,
      user_id: record.user_id || null,
      device: record.device,
      source: 'edge-function'
    },
    created_at: new Date().toISOString()
  };

  // Insert notification into database
  const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify(notificationData)
  });

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    console.error("Database insert error:", errorText);
    throw new Error(`Database insert error: ${insertResponse.statusText}`);
  }

  const result = await insertResponse.json();
  console.log("Notification created:", result[0]?.id, "for:", to);
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
    await sendEmail(ADMIN_EMAIL, subject, html, record);

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
