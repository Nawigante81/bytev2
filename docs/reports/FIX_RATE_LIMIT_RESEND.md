# 🎉 SUKCES! System działa - ale wymaga poprawki rate limit

**Status:** ✅ System emailowy DZIAŁA  
**Problem:** ⚠️ Rate limit Resend API (2 requesty/sekundę)

---

## 📊 Analiza wyniku

```json
{
  "success": true,
  "total": 22,
  "sent": 10,     ← ✅ 10 emaili wysłanych!
  "failed": 12    ← ⚠️ 12 przez rate limit
}
```

**Błąd:** `rate_limit_exceeded - You can only make 2 requests per second`

---

## 🎯 Co to oznacza?

✅ **System działa poprawnie:**
- Edge function `process-pending-notifications` działa
- Resend API key jest poprawny
- Emaile są wysyłane (10 się udało!)

⚠️ **Problem:** Wysyłamy za szybko - Resend Free Plan ma limit 2 req/sec

---

## 🔧 ROZWIĄZANIE: Dodaj opóźnienie między wysyłkami

Musimy zaktualizować `process-pending-notifications` żeby dodać delay między emailami.

### Zaktualizowana wersja z opóźnieniem

**Plik:** `supabase/functions/process-pending-notifications/index.ts`

Znajdź pętlę:
```typescript
for (const notification of pendingNotifications as Notification[]) {
  try {
    // ... wysyłka emaila
  }
}
```

I dodaj opóźnienie na końcu każdej iteracji:

```typescript
for (const notification of pendingNotifications as Notification[]) {
  try {
    console.log(`📤 Sending notification ${notification.notification_id}`);

    // Wyślij email przez Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      // ... kod wysyłki
    });

    // ... reszta kodu

  } catch (error: any) {
    console.error(`❌ Failed to send notification:`, error);
    // ... obsługa błędu
  }

  // 🚀 DODAJ TO: Opóźnienie 600ms między emailami (bezpieczny margines dla 2 req/sec)
  await new Promise(resolve => setTimeout(resolve, 600));
}
```

**Pełny poprawiony kod:** Zobacz poniżej

---

## 📝 Kompletny poprawiony plik

Zaktualizuj `supabase/functions/process-pending-notifications/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
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

    const { data: pendingNotifications, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(50);

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

    // Przetwarzaj każde powiadomienie Z OPÓŹNIENIEM
    for (const notification of pendingNotifications as Notification[]) {
      try {
        console.log(`📤 Sending ${notification.notification_id} to ${notification.recipient_email}`);

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
        console.log(`✅ Email sent: ${notification.notification_id}`);

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
          console.error(`⚠️ Failed to update status:`, updateError);
        }

        results.sent++;
        results.details.push({
          notification_id: notification.notification_id,
          status: 'sent',
          recipient: notification.recipient_email
        });

      } catch (error: any) {
        console.error(`❌ Failed to send ${notification.notification_id}:`, error);

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
          console.error(`⚠️ Failed to update status:`, updateError);
        }

        results.failed++;
        results.details.push({
          notification_id: notification.notification_id,
          status: 'failed',
          recipient: notification.recipient_email,
          error: error.message
        });
      }

      // 🚀 KLUCZOWE: Opóźnienie 600ms między emailami
      // Resend Free: 2 req/sec = 500ms minimum, używamy 600ms dla bezpieczeństwa
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
```

---

## 🚀 Wdrożenie poprawki

### Krok 1: Zaktualizuj plik lokalnie

Skopiuj powyższy kod do:
```
supabase/functions/process-pending-notifications/index.ts
```

### Krok 2: Wdróż zaktualizowaną funkcję

```bash
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp
```

### Krok 3: Poczekaj 30 sekund

Funkcja musi się zrestartować z nowym kodem.

### Krok 4: Przetestuj

```bash
curl -X POST "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU"
```

**Oczekiwany wynik:** Wszystkie "sent", zero "failed" z rate limit!

---

## 📊 Co się zmieni?

### Przed (BŁĄD):
- Wysyłka 22 emaili → natychmiast jeden po drugim
- Resend: "Hola, za szybko!" (rate limit)
- Wynik: 10 sent, 12 failed

### Po (FIX):
- Wysyłka 22 emaili → z opóźnieniem 600ms między każdym
- Resend: "OK, wszystko w porządku"
- Wynik: 22 sent, 0 failed 🎉

---

## 💡 Dodatkowe opcje

### Opcja A: Zwiększ limit w Resend

Jeśli masz dużo powiadomień, rozważ:
- **Resend Pro Plan:** 10 req/sec (zamiast 2)
- **Upgrade:** https://resend.com/pricing

### Opcja B: Batch processing

Jeśli masz setki powiadomień, dodaj batch processing:
- Przetwarzaj max 10-20 na raz
- Używaj cron job co 2-5 minut
- Pozostałe czekają na kolejną iterację

---

## ✅ Status po naprawie

Po wdrożeniu z opóźnieniem:

- ✅ Wszystkie emaile wysyłają się poprawnie
- ✅ Brak błędów rate limit
- ✅ System działa automatycznie (trigger)
- ✅ Emaile docierają do serwis@byteclinic.pl

---

**Następny krok:** Zaktualizuj kod i wdróż funkcję z opóźnieniem!
