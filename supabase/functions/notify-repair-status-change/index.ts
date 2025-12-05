// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Declare Deno global for TypeScript
declare const Deno: any;

// --- CONFIG ---
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@byteclinic.pl';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://byteclinic.pl';

// --- Helper: skrócone ID ---
const shortId = (id: string) => id?.slice(0, 8) || id;

// Status label mapping
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'new_request': 'Nowe zgłoszenie',
    'open': 'Otwarte',
    'waiting_for_parts': 'Oczekiwanie na części',
    'in_repair': 'W trakcie naprawy',
    'repair_completed': 'Naprawa zakończona',
    'ready_for_pickup': 'Gotowe do odbioru'
  };
  return statusMap[status] || status;
};

// --- SEND EMAIL VIA SUPABASE ---
async function sendEmail(to: string, subject: string, html: string, record: any, type: string) {
  // Create notification record in database
  const notificationData = {
    type: type,
    recipient_email: to,
    subject: subject,
    html_content: html,
    text_content: html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    status: 'pending',
    metadata: {
      repair_id: record.id,
      status: record.status,
      device: record.device_type,
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

// --- GENERATE EMAIL CONTENT ---
function generateStatusChangeEmail(repair: any, oldStatus: string, newStatus: string) {
  const oldStatusLabel = getStatusLabel(oldStatus);
  const newStatusLabel = getStatusLabel(newStatus);
  const repairId = shortId(repair.repair_id);
  const progress = getProgressForStatus(newStatus);
  
  const subject = `🔧 Aktualizacja naprawy #${repairId} - ${newStatusLabel}`;
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        🔧 Aktualizacja naprawy
      </h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #007bff;">
          Numer zlecenia: #${repairId}
        </h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <p><strong>Urządzenie:</strong><br>${repair.device_type} ${repair.device_model || ''}</p>
            <p><strong>Opis problemu:</strong><br>${repair.issue_description}</p>
            <p><strong>Technik:</strong><br>${repair.technician_name || 'ByteClinic Team'}</p>
          </div>
          <div>
            <p><strong>Szacowany czas:</strong><br>${repair.estimated_completion ? new Date(repair.estimated_completion).toLocaleDateString('pl-PL') : 'Nie określono'}</p>
            <p><strong>Szacowana cena:</strong><br>${repair.estimated_price ? repair.estimated_price + ' PLN' : 'Do określenia'}</p>
            <p><strong>Postęp:</strong><br>${progress}%</p>
          </div>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745;">
          <h4 style="margin: 0 0 10px 0; color: #28a745;">Status zmieniony:</h4>
          <p style="margin: 0;">
            <strong>${oldStatusLabel}</strong> → <strong style="color: #28a745;">${newStatusLabel}</strong>
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/panel/repair/${repair.id}" 
           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          📊 Zobacz szczegóły w panelu
        </a>
      </div>
      
      <div style="background: #e9ecef; padding: 15px; border-radius: 6px; font-size: 14px; color: #6c757d;">
        <p style="margin: 0;">
          📞 Masz pytania? Zadzwoń: <strong>+48 724 316 523</strong><br>
          💬 Odpowiemy na wszystkie pytania dotyczące Twojej naprawy
        </p>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
      <p style="text-align: center; color: #6c757d; font-size: 12px; margin: 0;">
        Automatyczna wiadomość z systemu ByteClinic<br>
        ${new Date().toLocaleDateString('pl-PL')}
      </p>
    </div>
  `;
  
  return { subject, html };
}

function getProgressForStatus(status: string): number {
  const progressMap: Record<string, number> = {
    'new_request': 10,
    'open': 25,
    'waiting_for_parts': 40,
    'in_repair': 70,
    'repair_completed': 90,
    'ready_for_pickup': 100
  };
  return progressMap[status] || 0;
}

// --- HTTP HANDLER ---
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { repair, old_status, new_status } = body;

    if (!repair || !repair.id || !old_status || !new_status) {
      return new Response("Missing required data", { status: 400 });
    }

    // Skip if status didn't actually change
    if (old_status === new_status) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: "Status unchanged, skipping notification"
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate email content
    const { subject, html } = generateStatusChangeEmail(repair, old_status, new_status);

    // Send email to customer
    if (repair.customer_email) {
      await sendEmail(repair.customer_email, subject, html, repair, 'repair_status_update');
    }

    // Send email to admin
    await sendEmail(ADMIN_EMAIL, `[ADMIN] ${subject}`, html, repair, 'repair_status_update_admin');

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Status change notifications sent successfully",
      repair_id: shortId(repair.id),
      status_change: `${getStatusLabel(old_status)} → ${getStatusLabel(new_status)}`
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