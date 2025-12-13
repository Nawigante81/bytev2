# 🔍 DIAGNOZA PROBLEMU: Brak powiadomień e-mail dla administratora

**Data:** 2025-12-10  
**Status:** 🔴 KRYTYCZNY - Administrator nie dostaje powiadomień  

---

## 📋 PODSUMOWANIE PROBLEMU

Administrator **NIE DOSTAJE** powiadomień e-mail o:
- Nowych zgłoszeniach z formularza kontaktowego
- Zapytaniach o wycenę z cennika
- Nowych rezerwacjach wizyt
- Innych zgłoszeniach użytkowników

---

## 🔎 ANALIZA SYSTEMU

### ✅ CO DZIAŁA POPRAWNIE:

1. **Formularze zapisują dane do bazy**
   - [`src/pages/Contact.jsx:151-168`](src/pages/Contact.jsx:151) - zapisuje do tabeli `requests`
   - [`src/pages/Pricing.jsx:59-76`](src/pages/Pricing.jsx:59) - zapisuje do tabeli `requests`
   - [`src/components/BookingSystem.jsx:144-161`](src/components/BookingSystem.jsx:144) - zapisuje do tabeli `requests`

2. **System powiadomień tworzy rekordy**
   - [`supabase/functions/notify-system/index.ts`](supabase/functions/notify-system/index.ts:1) - działa poprawnie
   - Tworzy powiadomienia w tabeli `notifications` ze statusem `'pending'`
   - Wspiera `sendAdminCopy` i `alwaysSendAdminCopy` (linia 178-189)

3. **Edge Function do przetwarzania istnieje**
   - [`supabase/functions/process-pending-notifications/index.ts`](supabase/functions/process-pending-notifications/index.ts:1) - istnieje i jest poprawnie napisana
   - Pobiera powiadomienia ze statusem `'pending'` (linia 40-46)
   - Wysyła przez Resend API (linia 79-92)

---

## ❌ ZIDENTYFIKOWANE PROBLEMY

### 🔴 PROBLEM #1: Brak automatycznego przetwarzania powiadomień
**Lokalizacja:** System Supabase  
**Opis:** Powiadomienia trafiają do tabeli `notifications` ze statusem `'pending'`, ale **NIGDY NIE SĄ PRZETWARZANE**

**Przyczyna:**
- Brak Supabase Cron Job lub Database Trigger
- Function `process-pending-notifications` istnieje, ale **nikt jej nie wywołuje**
- Powiadomienia gromadzą się w bazie z statusem `'pending'`

**Rozwiązania:**
```sql
-- OPCJA A: Database Trigger (natychmiastowe przetwarzanie)
CREATE OR REPLACE FUNCTION notify_pending_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Wywołaj edge function asynchronicznie
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/process-pending-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_pending_notifications
  AFTER INSERT ON notifications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_pending_notification();
```

```javascript
// OPCJA B: Cron Job (co 1-5 minut)
// W Supabase Dashboard > Database > Cron Jobs
// Lub użyj pg_cron extension
SELECT cron.schedule(
  'process-pending-notifications',
  '*/5 * * * *', -- Co 5 minut
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-pending-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

### 🔴 PROBLEM #2: Brak konfiguracji Resend API Key
**Lokalizacja:** Supabase Project Settings > Edge Functions > Secrets  
**Opis:** [`process-pending-notifications`](supabase/functions/process-pending-notifications/index.ts:6) wymaga `RESEND_API_KEY`, ale **NIE JEST SKONFIGUROWANY**

**Dowód:**
- W [`.env:10`](.env:10) klucz jest zakomentowany: `# VITE_EMAIL_API_KEY=...`
- Edge Functions potrzebują `RESEND_API_KEY` w Supabase Secrets, nie w `.env`

**Rozwiązanie:**
```bash
# 1. Uzyskaj klucz API z Resend.com
# 2. Skonfiguruj w Supabase:
supabase secrets set RESEND_API_KEY=re_XQCTf9xE_Ht6kDAj5dsWBXAQjGCGXw5H9

# 3. Ustaw nadawcę email:
supabase secrets set MAIL_FROM=noreply@byteclinic.pl

# 4. Ustaw email administratora:
supabase secrets set ADMIN_EMAIL=admin@byteclinic.pl
```

**WAŻNE:** Email nadawcy (`MAIL_FROM`) musi być zweryfikowany w Resend!

---

### 🟡 PROBLEM #3: Nieużywane funkcje w emailService.js
**Lokalizacja:** [`src/services/emailService.js:1137-1145`](src/services/emailService.js:1137)  
**Opis:** Kod próbuje wywoływać nieistniejące edge functions

**Nieprawidłowe mapowanie:**
```javascript
// Te funkcje NIE ISTNIEJĄ w projekcie:
'notify-booking-confirmation' // ❌
'notify-repair-status'        // ❌
'notify-repair-ready'         // ❌
'notify-appointment-reminder' // ❌
'notify-email-confirmation'   // ❌

// ISTNIEJĄCE funkcje:
'notify-system'                      // ✅
'process-pending-notifications'      // ✅
'send-email-resend'                  // ✅
```

**Aktualny flow (NIEPRAWIDŁOWY):**
```
Contact.jsx → emailService.sendRepairRequest()
  → wywołuje 'notify-new-diagnosis' (która NIE ISTNIEJE)
    → BŁĄD 404 → email nie wysłany
```

**Prawidłowy flow (POWINIEN BYĆ):**
```
Contact.jsx → wywołuje 'notify-system' bezpośrednio
  → notify-system tworzy rekord w 'notifications'
    → process-pending-notifications wysyła przez Resend
      → ✅ Email dostarczony
```

---

### 🟡 PROBLEM #4: Contact.jsx używa emailService zamiast notify-system
**Lokalizacja:** [`src/pages/Contact.jsx:190`](src/pages/Contact.jsx:190)  
**Opis:** Formularz kontaktowy wywołuje `emailService.sendRepairRequest()` który NIE DZIAŁA

**Aktualny kod:**
```javascript
await emailService.sendRepairRequest(emailData); // ❌ BŁ<br/>ĘDY
```

**Powinno być:**
```javascript
await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-system`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    template: 'repair_request',
    recipient: emailData.email,
    sendAdminCopy: true, // ⚠️ KLUCZOWE dla administratora!
    data: emailData
  })
});
```

---

## 🎯 ROZWIĄZANIE KROK PO KROKU

### KROK 1: Skonfiguruj Resend API
```bash
# W terminalu (wymaga Supabase CLI):
supabase secrets set RESEND_API_KEY=YOUR_RESEND_KEY_HERE
supabase secrets set MAIL_FROM=noreply@byteclinic.pl
supabase secrets set ADMIN_EMAIL=admin@byteclinic.pl

# Lub w Supabase Dashboard:
# Project Settings > Edge Functions > Manage secrets
```

### KROK 2: Dodaj automatyczne przetwarzanie
**Opcja A - Database Trigger (REKOMENDOWANE):**
```sql
-- Wykonaj w SQL Editor w Supabase Dashboard
-- Ten trigger natychmiast przetwarza nowe powiadomienia

CREATE OR REPLACE FUNCTION notify_admin_of_new_request()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  -- Pobierz konfigurację (ustaw w Project Settings > API Settings > URL)
  supabase_url := current_setting('app.settings')::json->>'supabase_url';
  service_key := current_setting('app.settings')::json->>'service_role_key';
  
  -- Wywołaj process-pending-notifications
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/process-pending-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Utwórz trigger
CREATE TRIGGER auto_process_notifications
  AFTER INSERT ON notifications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admin_of_new_request();
```

**Opcja B - Cron Job:**
Skonfiguruj w Supabase Dashboard > Database > Cron Jobs:
```
Name: process-pending-notifications
Schedule: */5 * * * * (co 5 minut)
Function: SELECT net.http_post(...)
```

### KROK 3: Napraw wywołania w formularzach

Zaktualizuj wszystkie formularze aby używały `notify-system` zamiast `emailService`.

---

## 📊 AKTUALNY STAN vs DOCELOWY STAN

### ❌ AKTUALNIE (NIE DZIAŁA):
```
Formularz → emailService.sendRepairRequest()
           → wywołuje nieistniejącą funkcję
             → ❌ BŁĄD 404
               → Administrator NIE DOSTAJE maila
```

### ✅ DOCELOWO (BĘDZIE DZIAŁAĆ):
```
Formularz → notify-system (bezpośrednie wywołanie)
           → tworzy notification (status='pending', sendAdminCopy=true)
             → [TRIGGER lub CRON] → process-pending-notifications
               → wysyła przez Resend API
                 → ✅ Administrator DOSTAJE maila
```

---

## 🚀 PILNE DZIAŁANIA

1. **NATYCHMIAST:** Skonfiguruj `RESEND_API_KEY` w Supabase Secrets
2. **NATYCHMIAST:** Dodaj Database Trigger lub Cron Job
3. **WAŻNE:** Napraw formularze (Contact, Pricing, Booking)
4. **WAŻNE:** Zweryfikuj domenę w Resend dla `MAIL_FROM`
5. **OPCJONALNIE:** Usuń nieużywany `emailService.js` lub go przebuduj

---

## 📝 DODATKOWE UWAGI

- Tabela `notifications` prawdopodobnie zawiera SETKI nieprzetw orzonych powiadomień
- Po naprawie, uruchom manualnie: `process-pending-notifications` aby wysłać zaległe
- Rozważ dodanie monitoringu: alert gdy `pending` > 10 przez > 1h
- Sprawdź logi Resend po pierwszym wysłaniu

---

## 🔗 POWIĄZANE PLIKI

- [`src/pages/Contact.jsx`](src/pages/Contact.jsx) - formularz kontaktowy
- [`src/pages/Pricing.jsx`](src/pages/Pricing.jsx) - formularz wyceny
- [`src/components/BookingSystem.jsx`](src/components/BookingSystem.jsx) - system rezerwacji
- [`supabase/functions/notify-system/index.ts`](supabase/functions/notify-system/index.ts) - tworzenie powiadomień
- [`supabase/functions/process-pending-notifications/index.ts`](supabase/functions/process-pending-notifications/index.ts) - wysyłka emaili
- [`src/services/emailService.js`](src/services/emailService.js) - serwis email (do naprawy/usunięcia)

---

**Utworzono:** 2025-12-10 12:22  
**Autor:** Kilo Code (AI Assistant)  
**Priorytet:** 🔴 KRYTYCZNY