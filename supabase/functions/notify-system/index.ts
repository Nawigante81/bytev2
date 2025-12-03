// System powiadomień oparty na Supabase Edge Functions z integracją Postmark
// Wysyła rzeczywiste emaili przez Postmark API

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Declare Deno global for TypeScript
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// Helper: logowanie powiadomień
function logNotification(type: string, data: any, result: any) {
  console.log('📧 === POWIADOMIENIE ===');
  console.log(`Typ: ${type}`);
  console.log(`Data: ${JSON.stringify(data, null, 2)}`);
  console.log(`Status: ${result.success ? '✅ Wysłane' : '❌ Błąd'}`);
  console.log(`Czas: ${new Date().toLocaleString('pl-PL')}`);
  console.log('=====================');
}

// Helper: generowanie ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Typy powiadomień
type NotificationType = 
  | 'repair_request'
  | 'booking_confirmation' 
  | 'repair_status_update'
  | 'repair_ready'
  | 'appointment_reminder'
  | 'email_confirmation';

interface NotificationData {
  type: NotificationType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  html: string;
  data?: any;
}

// Rzeczywiste wysyłanie powiadomień przez Postmark API
async function createNotification(notification: NotificationData) {
  const id = generateId();
  
  try {
    // Wysyłka przez Postmark API
    const postmarkData = {
      From: 'serwis@byteclinic.pl',
      To: notification.recipientEmail,
      Subject: notification.subject,
      HtmlBody: notification.html,
      TextBody: stripHtml(notification.html),
      ReplyTo: 'kontakt@byteclinic.pl',
      Headers: [
        { Name: 'X-PM-Message-Stream', Value: 'outbound' },
        { Name: 'X-PM-Template-Name', Value: notification.type },
        { Name: 'X-PM-Source', Value: 'byteclinic-edge-function' }
      ],
      TrackOpens: true,
      TrackLinks: 'HtmlOnly',
      Metadata: {
        type: notification.type,
        notificationId: id,
        timestamp: new Date().toISOString()
      }
    };

    // Wyślij email przez Postmark
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': 'd8babbf2-9ad2-49f1-9d6d-e1e62e003268'
      },
      body: JSON.stringify(postmarkData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Postmark error (${response.status}): ${errorText}`);
    }

    const postmarkResult = await response.json();
    
    const result = {
      success: true,
      id,
      messageId: postmarkResult.MessageID,
      message: 'Email wysłany przez Postmark API',
      type: notification.type,
      recipient: notification.recipientEmail,
      submittedAt: postmarkResult.SubmittedAt,
      timestamp: new Date().toISOString(),
      provider: 'postmark'
    };
    
    // Loguj powiadomienie
    logNotification(notification.type, notification, result);
    
    return result;
    
  } catch (error) {
    console.error('Błąd wysyłania emaila:', error);
    
    const result = {
      success: false,
      id,
      message: `Błąd wysyłania: ${error instanceof Error ? error.message : String(error)}`,
      type: notification.type,
      recipient: notification.recipientEmail,
      timestamp: new Date().toISOString(),
      provider: 'postmark'
    };
    
    logNotification(notification.type, notification, result);
    return result;
  }
}

// Helper function do usuwania HTML
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Funkcje pomocnicze dla różnych typów powiadomień
function createRepairRequestNotification(data: any) {
  return {
    type: 'repair_request' as NotificationType,
    recipientEmail: 'admin@byteclinic.pl', // Email admina
    recipientName: 'Admin ByteClinic',
    subject: `🔔 Nowe zgłoszenie naprawcze #${data.id?.slice(0, 8) || 'NEW'}`,
    html: `
      <h2>🔔 Nowe zgłoszenie naprawcze</h2>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString('pl-PL')}</p>
      
      <h3>👤 Klient</h3>
      <p><strong>Imię:</strong> ${data.name || 'Nie podano'}<br/>
      <strong>Email:</strong> ${data.email || 'Brak'}<br/>
      <strong>Telefon:</strong> ${data.phone || 'Brak'}</p>
      
      <h3>💻 Szczegóły urządzenia</h3>
      <p><strong>Kategoria:</strong> ${data.device || 'Nie określono'}</p>
      
      <h3>📝 Opis problemu</h3>
      <p>${data.message || 'Brak opisu'}</p>
      
      <hr/>
      <p><small>Zgłoszenie wysłane z formularza kontaktowego ByteClinic</small></p>
    `,
    data
  };
}

function createBookingConfirmationNotification(data: any) {
  return {
    type: 'booking_confirmation' as NotificationType,
    recipientEmail: data.email,
    recipientName: data.name,
    subject: `✅ Potwierdzenie rezerwacji - ByteClinic`,
    html: `
      <h2>✅ Potwierdzenie rezerwacji</h2>
      <p>Dziękujemy za dokonanie rezerwacji!</p>
      
      <h3>Szczegóły wizyty</h3>
      <p><strong>Data:</strong> ${data.date}<br/>
      <strong>Godzina:</strong> ${data.time}<br/>
      <strong>Usługa:</strong> ${data.service}</p>
      
      <p>Czekamy na Ciebie w ByteClinic!</p>
    `,
    data
  };
}

function createRepairStatusNotification(data: any) {
  return {
    type: 'repair_status_update' as NotificationType,
    recipientEmail: data.email,
    recipientName: data.name,
    subject: `🔧 Aktualizacja statusu naprawy - ByteClinic`,
    html: `
      <h2>🔧 Aktualizacja statusu naprawy</h2>
      <p>Status Twojej naprawy został zaktualizowany.</p>
      
      <h3>Szczegóły</h3>
      <p><strong>Numer naprawy:</strong> ${data.repairId}<br/>
      <strong>Nowy status:</strong> ${data.status}<br/>
      <strong>Postęp:</strong> ${data.progress || 0}%</p>
      
      ${data.notes ? `<p><strong>Uwagi:</strong> ${data.notes}</p>` : ''}
    `,
    data
  };
}

// Główny handler
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { template, data } = body;

    if (!template) {
      return new Response(JSON.stringify({ 
        error: { code: 'MISSING_TEMPLATE', message: 'Template is required' } 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let notification: NotificationData;

    switch (template) {
      case 'repair_request':
        notification = createRepairRequestNotification(data);
        break;
      case 'booking_confirmation':
        notification = createBookingConfirmationNotification(data);
        break;
      case 'repair_status_update':
        notification = createRepairStatusNotification(data);
        break;
      default:
        return new Response(JSON.stringify({ 
          error: { code: 'UNKNOWN_TEMPLATE', message: `Unknown template: ${template}` } 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const result = await createNotification(notification);

    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(JSON.stringify({ 
      error: { 
        code: 'NOTIFICATION_ERROR', 
        message: String(error) 
      } 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});