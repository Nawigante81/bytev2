# 🚨 Produkcja: Powiadomienia się zapisują, ale nie wysyłają

**Problem:** Na serwerze produkcyjnym powiadomienia trafiają do bazy, ale NIE są wysyłane przez Resend  
**Przyczyna:** Prawdopodobnie brak konfiguracji w środowisku produkcyjnym

---

## 🔍 Diagnoza różnic: Localhost vs Produkcja

### Na localhost (działa):
- ✅ Zmienne środowiskowe z `.env`
- ✅ Edge functions testowane lokalnie
- ✅ Secrets mogą być z `.env`

### Na produkcji (nie działa):
- ❌ Brak `.env` (nie jest wdrażany)
- ❌ Edge functions mogą nie być wdrożone
- ❌ Secrets muszą być w Supabase
- ❌ Trigger może nie być w produkcyjnej bazie

---

## 🎯 Najczęstsze przyczyny

### 1. **RESEND_API_KEY nie jest ustawiony w Supabase Secrets**

Edge functions w produkcji NIE czytają z `.env`! Muszą mieć secrets w Supabase.

**Sprawdź:**
```
Supabase Dashboard > Settings > Edge Functions > Secrets
```

**Jeśli brak `RESEND_API_KEY`:**

```bash
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
```

**Poczekaj 30 sekund na restart funkcji!**

---

### 2. **Edge functions nie są wdrożone na produkcji**

Aplikacja front-end może być wdrożona, ale edge functions muszą być wdrożone OSOBNO.

**Sprawdź:**
```bash
supabase functions list --project-ref wllxicmacmfzmqdnovhp
```

**Jeśli brak funkcji, wdróż:**
```bash
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp
```

---

### 3. **Trigger nie został utworzony w produkcyjnej bazie**

Migracje SQL nie zawsze są automatycznie wykonywane podczas wdrożenia.

**Sprawdź czy trigger istnieje:**

W Supabase Dashboard > SQL Editor:
```sql
SELECT trigger_name 
FROM information_schema.triggers
WHERE trigger_name = 'auto_process_notifications';
```

**Jeśli BRAK wyniku, wykonaj migrację:**

1. Otwórz Supabase Dashboard > SQL Editor
2. Wklej zawartość: `supabase/migrations/20251210_setup_auto_notifications.sql`
3. Kliknij Run

---

### 4. **CORS lub URL problems**

Frontend produkcyjny może mieć inny URL niż localhost.

**Sprawdź w logach Supabase:**
```
Dashboard > Logs > Edge Functions
```

Szukaj błędów CORS lub 403.

---

## 📋 Checklist produkcyjny

Wykonaj po kolei:

### ✅ Krok 1: Sprawdź Supabase Secrets

```bash
supabase secrets list --project-ref wllxicmacmfzmqdnovhp
```

**Musi być:**
- `RESEND_API_KEY`
- `MAIL_FROM` (opcjonalne)
- `ADMIN_EMAIL` (opcjonalne)
- `SUPABASE_SERVICE_ROLE_KEY` (automatyczne)
- `SUPABASE_URL` (automatyczne)

**Jeśli brak, ustaw:**
```bash
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
```

---

### ✅ Krok 2: Sprawdź edge functions

**Test notify-system:**
```bash
curl -X POST "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-system" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok" \
  -d '{
    "template": "repair_request",
    "recipient": "test@example.com",
    "sendAdminCopy": true,
    "data": {
      "id": "TEST",
      "name": "Test",
      "email": "test@example.com",
      "phone": "123",
      "device": "Test",
      "message": "Test produkcyjny"
    }
  }'
```

**Oczekiwany rezultat:** `{"success":true,...}`

**Jeśli błąd 404:** Funkcja nie jest wdrożona → Wdróż:
```bash
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
```

---

### ✅ Krok 3: Sprawdź trigger

```sql
-- W Supabase SQL Editor
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'auto_process_notifications';
```

**Jeśli brak wyniku:**
1. Otwórz `supabase/migrations/20251210_setup_auto_notifications.sql`
2. Wklej do SQL Editor
3. Uruchom (Run)

---

### ✅ Krok 4: Sprawdź status powiadomień

```sql
SELECT 
  notification_id,
  recipient_email,
  status,
  created_at,
  sent_at,
  error_message
FROM notifications
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**Szukaj:**
- Jeśli wszystkie `'pending'` → Trigger nie działa lub brak secrets
- Jeśli `'failed'` z error_message → Patrz na błąd (prawdopodobnie brak RESEND_API_KEY)
- Jeśli `'sent'` → System działa!

---

### ✅ Krok 5: Ręcznie przetworz pending

```bash
curl -X POST "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU"
```

**Rezultat powinien pokazać:**
- Jeśli `"sent": X, "failed": 0` → Secrets są OK, trigger jest problemem
- Jeśli `"failed": X` z "Missing RESEND_API_KEY" → Brak secrets
- Jeśli błąd 404 → Funkcja nie jest wdrożona

---

## 🔧 Szybka naprawa ALL-IN-ONE

Wykonaj wszystko naraz:

```bash
# 1. Ustaw wszystkie secrets
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp

# 2. Wdróż/prze-wdróż edge functions
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp

# 3. Poczekaj 30 sekund
echo "Czekam 30 sekund na restart funkcji..."
sleep 30

# 4. Test
curl -X POST "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU"
```

**Następnie w Supabase SQL Editor uruchom trigger:**
```sql
-- Pełna migracja z pliku: supabase/migrations/20251210_setup_auto_notifications.sql
```

---

## 🔍 Sprawdzenie logów produkcyjnych

### Edge Functions Logs
```
Supabase Dashboard > Logs > Edge Functions
```

**Szukaj:**
- ✅ Wywołań `process-pending-notifications`
- ❌ Błędów "Missing RESEND_API_KEY"
- ❌ Błędów "rate_limit_exceeded"
- ❌ Błędów 500/403

### Postgres Logs
```
Supabase Dashboard > Logs > Postgres Logs
```

**Szukaj:**
- ✅ "Triggered process-pending-notifications"
- ❌ "Edge call failed"

---

## 💡 Typowe scenariusze

### Scenariusz A: Secrets nie są ustawione

**Objawy:**
- Powiadomienia są `'pending'`
- Logi pokazują "Missing RESEND_API_KEY"

**Fix:**
```bash
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
```

### Scenariusz B: Edge functions nie są wdrożone

**Objawy:**
- Powiadomienia są `'pending'`
- Test curl daje 404

**Fix:**
```bash
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp
```

### Scenariusz C: Trigger nie istnieje

**Objawy:**
- Powiadomienia pozostają `'pending'`
- Ręczne wywołanie działa, ale automatyczne nie

**Fix:**
Uruchom migrację w SQL Editor

### Scenariusz D: Wszystko OK, ale opóźnienie

**Objawy:**
- Powiadomienia są `'pending'` przez 1-2 minuty
- Potem status zmienia się na `'sent'`

**To normalne!** Trigger może mieć lekkie opóźnienie. Jeśli emaile docierają po czasie, wszystko działa poprawnie.

---

## 📊 Oczekiwany rezultat po naprawie

### 1. Test curl pokazuje:
```json
{"success":true,"total":X,"sent":X,"failed":0}
```

### 2. Tabela notifications:
```sql
status = 'sent' (nie 'pending')
sent_at IS NOT NULL
error_message IS NULL
```

### 3. Resend Dashboard:
- Widoczne wysłane emaile
- Status: Delivered

### 4. Email dotarł:
- Klient: Potwierdzenie
- `serwis@byteclinic.pl`: Kopia zgłoszenia

---

## 🆘 Jeśli nadal nie działa

Wykonaj pełną diagnostykę i prześlij wyniki:

```bash
# 1. Sprawdź secrets
supabase secrets list --project-ref wllxicmacmfzmqdnovhp

# 2. Sprawdź funkcje
supabase functions list --project-ref wllxicmacmfzmqdnovhp

# 3. Test notify-system
curl -X POST "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-system" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok" \
  -H "Content-Type: application/json" \
  -d '{"template":"repair_request","recipient":"test@example.com","data":{"name":"Test"}}'

# 4. Test process
curl -X POST "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU"

# 5. Sprawdź trigger
# W SQL Editor: SELECT * FROM information_schema.triggers WHERE trigger_name = 'auto_process_notifications';
```

---

**TL;DR:** Najprawdopodobniej brak `RESEND_API_KEY` w Supabase Secrets. Ustaw go i poczekaj 30 sekund. Jeśli to nie pomaga, sprawdź czy edge functions są wdrożone i czy trigger istnieje w bazie.
