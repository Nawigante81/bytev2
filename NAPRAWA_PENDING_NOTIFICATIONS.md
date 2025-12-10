# 🔧 NAPRAWA: Wszystkie powiadomienia mają status 'pending'

**Problem:** Powiadomienia są tworzone, ale NIE są przetwarzane (wysyłane)  
**Status:** 🚨 Wymaga natychmiastowej naprawy

---

## 🎯 Diagnoza

✅ `notify-system` działa - tworzy wpisy w tabeli `notifications`  
❌ `process-pending-notifications` NIE jest wywoływana  
❌ Status pozostaje `pending` zamiast zmienić się na `sent`

**Możliwe przyczyny:**
1. Trigger `auto_process_notifications` nie został utworzony
2. Edge function `process-pending-notifications` nie jest wdrożona
3. Brak `RESEND_API_KEY` w Supabase Secrets
4. Rozszerzenie `http` nie jest włączone

---

## 🚀 PLAN NAPRAWY (krok po kroku)

### Krok 1: Sprawdź czy trigger istnieje

**SQL Query w Supabase Dashboard > SQL Editor:**

```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_process_notifications';
```

**Rezultat:**
- **Jeśli jest wynik** → Trigger istnieje, przejdź do Kroku 2
- **Jeśli BRAK wyniku** → Trigger nie został utworzony → **Wykonaj Fix A**

---

### FIX A: Utwórz trigger

**W Supabase Dashboard > SQL Editor uruchom:**

```sql
-- Włącz rozszerzenie http
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Utwórz funkcję triggera
CREATE OR REPLACE FUNCTION public.trigger_process_pending_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text := 'https://wllxicmacmfzmqdnovhp.supabase.co';
  service_key text := current_setting('app.settings', true)::json->>'service_role_key';
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/process-pending-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || COALESCE(service_key, ''),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('notification_id', NEW.notification_id),
      timeout_milliseconds := 2000
    );

    RAISE LOG 'Triggered process-pending-notifications for %', NEW.notification_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Edge call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Utwórz trigger
DROP TRIGGER IF EXISTS auto_process_notifications ON public.notifications;

CREATE TRIGGER auto_process_notifications
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.trigger_process_pending_notifications();
```

**Sprawdź ponownie czy trigger istnieje:**
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'auto_process_notifications';
```

Jeśli jest wynik → **✅ Trigger utworzony!** Przejdź do Kroku 2.

---

### Krok 2: Sprawdź czy edge function jest wdrożona

**Test wywołania:**

```bash
curl -X POST \
  "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU" \
  -H "Content-Type: application/json"
```

**Rezultat:**
- **Status 200 + JSON** → Funkcja działa, przejdź do Kroku 3
- **Status 404** → Funkcja nie jest wdrożona → **Wykonaj Fix B**
- **Błąd połączenia** → Problem z siecią lub kluczem

---

### FIX B: Wdróż edge function

```bash
# Zaloguj się do Supabase
supabase login

# Wdróż funkcję
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp
```

**Poczekaj 30 sekund na inicjalizację**

**Test ponownie:**
```bash
curl -X POST \
  "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU"
```

Jeśli status 200 → **✅ Funkcja wdrożona!** Przejdź do Kroku 3.

---

### Krok 3: Ustaw RESEND_API_KEY w Supabase Secrets

**Przez CLI:**
```bash
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
```

**Przez Dashboard:**
1. Otwórz: https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions
2. W sekcji "Secrets" dodaj:
   ```
   RESEND_API_KEY = re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA
   MAIL_FROM = onboarding@resend.dev
   ADMIN_EMAIL = serwis@byteclinic.pl
   ```
3. Zapisz

**Poczekaj 30 sekund na restart funkcji**

---

### Krok 4: Przetestuj ręcznie pending notifications

**A. Wywołaj process-pending-notifications ręcznie:**

```bash
curl -X POST \
  "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU"
```

**Oczekiwany rezultat:**
```json
{
  "success": true,
  "total": X,
  "sent": X,
  "failed": 0
}
```

**B. Sprawdź status w bazie:**

```sql
SELECT 
  notification_id,
  recipient_email,
  status,
  sent_at,
  error_message
FROM notifications
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Jeśli status zmienił się na 'sent':** ✅ **DZIAŁA!**  
**Jeśli nadal 'pending':** Sprawdź error_message lub logi funkcji

---

### Krok 5: Test nowego powiadomienia (z triggerem)

**A. Wyślij formularz kontaktowy:**
- Otwórz: https://byteclinic.pl/kontakt
- Wypełnij i wyślij

**B. Sprawdź czy status zmienił się automatycznie:**

```sql
-- Odczekaj 5 sekund, potem sprawdź
SELECT 
  notification_id,
  status,
  created_at,
  sent_at
FROM notifications
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 5;
```

**Jeśli nowe powiadomienie ma status 'sent':** 🎉 **SYSTEM DZIAŁA!**  
**Jeśli 'pending':** Sprawdź logi Postgres i Edge Functions

---

## 🔍 Sprawdzenie logów

### Postgres Logs (trigger)
```
Supabase Dashboard > Logs > Postgres Logs
```

Szukaj:
- ✅ `Triggered process-pending-notifications for notif_...`
- ❌ `Edge call failed: ...`

### Edge Functions Logs
```
Supabase Dashboard > Edge Functions > process-pending-notifications > Logs
```

Szukaj:
- ✅ Wywołań funkcji
- ✅ `Email sent successfully`
- ❌ `Missing RESEND_API_KEY`
- ❌ `Resend API error: 403`

---

## 📋 Quick Checklist

Wykonaj wszystko po kolei:

- [ ] **Krok 1:** Sprawdź czy trigger istnieje
  - [ ] Jeśli nie → Uruchom FIX A
- [ ] **Krok 2:** Sprawdź czy funkcja jest wdrożona
  - [ ] Jeśli nie → Uruchom FIX B
- [ ] **Krok 3:** Ustaw RESEND_API_KEY w Secrets
- [ ] **Krok 4:** Wywołaj funkcję ręcznie i sprawdź status
- [ ] **Krok 5:** Test z nowym powiadomieniem

---

## 🚀 All-in-One Fix (jeśli nie masz czasu na diagnozę)

Wykonaj wszystko naraz:

```bash
# 1. Ustaw secrets
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp

# 2. Wdróż funkcję
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp

# 3. Poczekaj 30 sekund
echo "Czekam 30 sekund na restart..."
sleep 30

# 4. Przetworz pending
curl -X POST \
  "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU"
```

**Następnie uruchom SQL z FIX A** (trigger) w Supabase SQL Editor.

---

## 🎯 Oczekiwany rezultat po naprawie

1. **Tabela notifications:** Nowe wpisy mają status 'sent' (nie 'pending')
2. **Resend Dashboard:** Widoczne wysłane emaile
3. **Email dotarł:** Sprawdź `serwis@byteclinic.pl`

---

**Status:** Ten dokument przeprowadzi Cię krok po kroku przez naprawę problemu z pending notifications.
