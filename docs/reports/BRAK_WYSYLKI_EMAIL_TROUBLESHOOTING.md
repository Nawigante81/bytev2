# 🚨 Troubleshooting: Brak wysyłki emaili / Brak logów w Resend

**Problem:** Emaile nie są wysyłane, brak logów w Resend Dashboard  
**Data:** 2025-12-10

---

## 🔍 Diagnoza automatyczna

Uruchom skrypt diagnostyczny:

```bash
node diagnoza-email-system.js
```

Skrypt sprawdzi:
- ✅ Zmienne środowiskowe
- ✅ Edge functions (czy są wdrożone)
- ✅ Tabelę notifications
- ✅ Wywołanie notify-system
- ✅ Połączenie z Resend API

---

## 🎯 Najczęstsze przyczyny braku wysyłki

### 1. **RESEND_API_KEY nie jest ustawiony w Supabase Secrets**

**Symptom:** Edge functions odpowiadają, ale nie wysyłają emaili

**Rozwiązanie:**
```bash
# Ustaw secret w Supabase
supabase secrets set RESEND_API_KEY=<RESEND_API_KEY> --project-ref wllxicmacmfzmqdnovhp
```

**Lub przez Dashboard:**
1. Otwórz: https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions
2. W sekcji "Secrets" dodaj:
   ```
   RESEND_API_KEY = <RESEND_API_KEY>
   ```
3. Zapisz i odczekaj 30 sekund (restart funkcji)

---

### 2. **Edge functions nie są wdrożone**

**Symptom:** Błąd 404 lub timeout przy wywołaniu funkcji

**Rozwiązanie:**
```bash
# Sprawdź czy funkcje istnieją
supabase functions list --project-ref wllxicmacmfzmqdnovhp

# Wdróż wszystkie funkcje
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp
```

---

### 3. **Powiadomienia trafiają do bazy, ale nie są przetwarzane**

**Symptom:** Tabela `notifications` ma wpisy ze statusem `pending`

**Sprawdź:**
```sql
SELECT 
  notification_id,
  status,
  recipient_email,
  created_at,
  error_message
FROM notifications
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

**Jeśli są wpisy "pending":**

#### A. Trigger nie działa (nie wywołuje edge function)

**Rozwiązanie:**
```bash
# Uruchom migrację ponownie
# W Supabase Dashboard > SQL Editor wykonaj:
# supabase/migrations/20251210_setup_auto_notifications.sql
```

**Sprawdź czy trigger istnieje:**
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'auto_process_notifications';
```

Jeśli brak wyniku → trigger nie został utworzony

#### B. Edge function process-pending-notifications ma błąd

**Sprawdź logi:**
```
Supabase Dashboard > Edge Functions > process-pending-notifications > Logs
```

Szukaj błędów typu:
- `Missing RESEND_API_KEY` → Ustaw secret
- `Resend API error: 403` → Klucz nieprawidłowy
- `Failed to send email` → Problem z konfiguracją

#### C. Ręcznie przetworz pending notifications

```bash
# Wywołaj edge function manualnie
curl -X POST \
  "${VITE_SUPABASE_URL}/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json"
```

---

### 4. **Klucz API Resend jest nieprawidłowy lub wygasł**

**Test klucza:**
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer <RESEND_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "delivered@resend.dev",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'
```

**Oczekiwany rezultat:** Status 200 i ID emaila

**Jeśli błąd 403/401:**
- Klucz jest nieprawidłowy
- Klucz wygasł
- Wygeneruj nowy klucz w Resend Dashboard

---

### 5. **Domena nie jest zweryfikowana w Resend**

**Sprawdź:**
1. Otwórz: https://resend.com/domains
2. Znajdź `byteclinic.pl`
3. Status powinien być: ✅ Verified

**Jeśli niezweryfikowana:**
- Dodaj rekordy DNS (SPF, DKIM, DMARC)
- Poczekaj na weryfikację (~24h)
- Tymczasowo użyj `onboarding@resend.dev` jako nadawcy

---

### 6. **MAIL_FROM używa niezweryfikowanej domeny**

**Problem:** Edge function próbuje wysłać z `noreply@byteclinic.pl`, ale domena nie jest zweryfikowana

**Rozwiązanie tymczasowe:**
```bash
# Ustaw domyślnego nadawcę Resend
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
```

**Rozwiązanie docelowe:**
- Zweryfikuj domenę w Resend
- Ustaw `MAIL_FROM=noreply@byteclinic.pl`

---

## 📋 Checklist debugowania

Przejdź przez każdy punkt:

- [ ] Uruchom `node diagnoza-email-system.js`
- [ ] Sprawdź czy `RESEND_API_KEY` jest w Supabase Secrets
- [ ] Sprawdź czy edge functions są wdrożone
- [ ] Sprawdź logi Edge Functions w Dashboard
- [ ] Sprawdź czy tabela `notifications` ma wpisy `pending`
- [ ] Sprawdź czy trigger `auto_process_notifications` istnieje
- [ ] Przetestuj klucz Resend API (curl)
- [ ] Sprawdź domenę w Resend Dashboard
- [ ] Sprawdź ustawienie `MAIL_FROM`

---

## 🔧 Szybkie naprawy

### Restart całego systemu:

```bash
# 1. Ustaw secrets
supabase secrets set RESEND_API_KEY=<RESEND_API_KEY> --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp

# 2. Wdróż edge functions
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp

# 3. Wykonaj migrację (trigger)
# W Supabase Dashboard > SQL Editor:
# Uruchom: supabase/migrations/20251210_setup_auto_notifications.sql

# 4. Test
node test-auto-notifications.js
```

---

## 📊 Sprawdzenie czy działa

### Test 1: Wyślij testowe powiadomienie

```bash
node test-auto-notifications.js
```

**Oczekiwany wynik:**
- ✅ Powiadomienie wstawione do bazy
- ✅ Status zmienił się na `sent` w ciągu 5 sekund
- ✅ Email pojawił się w logach Resend

### Test 2: Formularz kontaktowy

1. Otwórz: https://byteclinic.pl/kontakt
2. Wypełnij formularz
3. Wyślij
4. Sprawdź:
   - [ ] Email potwierdzenia dotarł do klienta
   - [ ] Email kopii dotarł na `serwis@byteclinic.pl`
   - [ ] Email widoczny w Resend Dashboard > Logs

---

## 🆘 Jeśli nic nie pomaga

### Plan B: Manuale przetwarzanie

Jeśli automatyczny system nie działa, możesz przetwarzać powiadomienia manualnie:

```bash
# Co 5 minut uruchom:
curl -X POST \
  "${VITE_SUPABASE_URL}/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

### Plan C: Cron Job

Dodaj cron job w migracji (odkomentuj sekcję w pliku):
```
supabase/migrations/20251210_setup_auto_notifications.sql
```

Cron będzie przetwarzał pending co 5 minut jako backup.

---

## 📚 Dodatkowe zasoby

- **Skrypt diagnostyczny:** `diagnoza-email-system.js`
- **Test systemu:** `test-auto-notifications.js`
- **Instrukcja wdrożenia:** `INSTRUKCJA_WDROZENIA_POWIADOMIEN_AUTO.md`
- **Dokumentacja Resend:** https://resend.com/docs
- **Supabase Functions Logs:** https://app.supabase.com/project/wllxicmacmfzmqdnovhp/logs/edge-functions

---

**Status:** Użyj tego dokumentu krok po kroku, żeby znaleźć i naprawić problem z wysyłką emaili.
