# 📧 INSTRUKCJA KONFIGURACJI SYSTEMU POWIADOMIEŃ EMAIL

**Data:** 2025-12-10  
**Status:** 🔴 WYMAGANA AKCJA ADMINISTRATORA  
**Priorytet:** KRYTYCZNY

---

## 🎯 CEL

Skonfigurować system powiadomień email aby **administrator otrzymywał powiadomienia** o:
- Nowych zgłoszeniach z formularza kontaktowego
- Zapytaniach o wycenę z cennika
- Nowych rezerwacjach wizyt
- Innych zgłoszeniach użytkowników

---

## ✅ CO ZOSTAŁO JUŻ NAPRAWIONE

1. ✅ **Formularze zaktualizowane** - teraz poprawnie wywołują `notify-system`
2. ✅ **Trigger utworzony** - automatycznie przetwarza nowe powiadomienia
3. ✅ **Edge functions działają** - `notify-system` i `process-pending-notifications` są gotowe

---

## 🔧 CO MUSISZ ZROBIĆ (3 KROKI)

### KROK 1: Uzyskaj klucz API z Resend

1. Przejdź do **https://resend.com/**
2. Zaloguj się lub utwórz darmowe konto
3. Przejdź do **API Keys** w dashboardzie
4. Kliknij **Create API Key**
5. Nazwij go: `ByteClinic Production`
6. **Skopiuj klucz** (format: `re_xxxxxxxxxxxxx`)

⚠️ **WAŻNE:** Klucz jest pokazywany tylko raz! Zapisz go bezpiecznie.

---

### KROK 2: Zweryfikuj domenę email nadawcy (WYMAGANE)

Resend wymaga weryfikacji domeny przed wysyłką emaili.

#### Opcja A: Użyj domeny ByteClinic (REKOMENDOWANE)

1. W Resend Dashboard przejdź do **Domains**
2. Kliknij **Add Domain**
3. Wpisz: `byteclinic.pl`
4. Dodaj podane rekordy DNS do swojego dostawcy domeny:
   ```
   TXT: _resend.byteclinic.pl → [wartość z Resend]
   MX: byteclinic.pl → feedback-smtp.us-east-1.amazonses.com (priority: 10)
   ```
5. Czekaj na weryfikację (zwykle 15-60 minut)
6. Email nadawcy będzie: `noreply@byteclinic.pl`

#### Opcja B: Użyj darmowego adresu Resend (TYLKO DO TESTÓW)

Jeśli nie masz dostępu do DNS lub chcesz szybko przetestować:
- Email nadawcy: `onboarding@resend.dev`
- ⚠️ To działa tylko dla testów, NIE dla produkcji!

---

### KROK 3: Skonfiguruj Supabase Secrets

#### Metoda A: Przez Supabase Dashboard (NAJŁATWIEJSZA)

1. Przejdź do **https://supabase.com**
2. Wybierz projekt **ByteClinic**
3. Przejdź do **Project Settings** > **Edge Functions** > **Manage secrets**
4. Dodaj następujące sekrety:

```bash
# Klucz API z Resend (z Kroku 1)
RESEND_API_KEY=re_twój_klucz_tutaj

## Email NADAWCY (z Kroku 2)
# Jeśli zweryfikowałeś domenę:
MAIL_FROM=noreply@byteclinic.pl

# Jeśli testujesz z Resend:
# MAIL_FROM=onboarding@resend.dev

# Email ADMINISTRATORA (gdzie mają przychodzić powiadomienia)
ADMIN_EMAIL=admin@byteclinic.pl  # ZMIEŃ NA SWÓJ EMAIL!
```

5. Kliknij **Save** przy każdym sekrecie

#### Metoda B: Przez Supabase CLI (DLA ZAAWANSOWANYCH)

Jeśli masz zainstalowane Supabase CLI:

```bash
# Zaloguj się
supabase login

# Link projektu
supabase link --project-ref wllxicmacmfzmqdnovhp

# Ustaw sekrety
supabase secrets set RESEND_API_KEY=re_twój_klucz_tutaj
supabase secrets set MAIL_FROM=noreply@byteclinic.pl
supabase secrets set ADMIN_EMAIL=admin@byteclinic.pl

# Sprawdź czy są ustawione
supabase secrets list
```

---

## 🗄️ KROK 4: Wykonaj migrację bazy danych

Migracja tworzy trigger, który automatycznie wysyła powiadomienia.

#### Metoda A: Przez Supabase Dashboard (REKOMENDOWANE - NAJSZYBSZE)

1. Przejdź do **Supabase Dashboard** > **SQL Editor**
2. Kliknij **New query**
3. Otwórz plik [`supabase/migrations/20251210_setup_auto_notifications.sql`](supabase/migrations/20251210_setup_auto_notifications.sql)
4. Skopiuj **całą zawartość** pliku
5. Wklej do SQL Editor
6. **WAŻNE:** Przed wykonaniem, znajdź linię (~79):
   ```sql
   supabase_url := 'https://wllxicmacmfzmqdnovhp.supabase.co';
   ```
   Upewnij się że URL jest poprawny!
7. Kliknij **Run** (lub Ctrl+Enter)
8. Sprawdź czy nie ma błędów (powinno działać bez problemów)

✅ **Ta metoda jest najlepsza** - omija problemy ze starszymi migracjami

#### Metoda B: Przez Supabase CLI (jeśli chcesz zsynchronizować wszystkie migracje)

⚠️ **Uwaga:** Jeśli `supabase db push --include-all` pokazuje błędy w starszych migracjach:

**Opcja 1 - Ignoruj stare migracje i użyj SQL Editor (Metoda A powyżej)**

**Opcja 2 - Napraw stare migracje:**
```bash
# Zobacz szczegóły błędu
supabase db push --include-all --debug

# Ręcznie napraw problematyczne migracje w folderze migrations/
# Lub skasuj stare migracje jeśli już są wykonane na produkcji
```

**Opcja 3 - Reset historii migracji (OSTROŻNIE!):**
```bash
# To zresetuje tracking migracji (NIE usuwa danych!)
supabase db remote commit

# Potem push nowych migracji
supabase db push
```

---

## ✅ WERYFIKACJA - Czy wszystko działa?

### Test 1: Sprawdź czy secrets są ustawione

W Supabase Dashboard > Project Settings > Edge Functions > Edge Function Secrets powinieneś widzieć:
- ✅ `RESEND_API_KEY`
- ✅ `MAIL_FROM`
- ✅ `ADMIN_EMAIL`

### Test 2: Sprawdź czy trigger działa

Wykonaj w SQL Editor:

```sql
-- Sprawdź czy trigger istnieje
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'auto_process_notifications';

-- Powinno zwrócić:
-- trigger_name: auto_process_notifications
-- event_object_table: notifications
```

### Test 3: Wyślij testowe zgłoszenie

1. Przejdź na stronę: **https://byteclinic.pl/kontakt**
2. Wypełnij formularz kontaktowy
3. Wyślij zgłoszenie
4. **SPRAWDŹ EMAIL ADMINISTRATORA** - powinien przyjść email w ciągu 1-5 minut

### Test 4: Sprawdź logi

W Supabase Dashboard:

1. **Logs > Postgres Logs** - poszukaj wpisów z triggera
2. **Logs > Edge Functions** - sprawdź czy `process-pending-notifications` się wykonała
3. **Database > Table Editor > notifications** - sprawdź status powiadomień

Powiadomienia powinny mieć status:
- `pending` → dopiero utworzone
- `sent` → pomyślnie wysłane
- `failed` → błąd wysyłki

---

## 🔍 ROZWIĄZYWANIE PROBLEMÓW

### Problem: "Missing RESEND_API_KEY"

**Przyczyna:** Secret nie jest ustawiony lub edge function nie może go odczytać

**Rozwiązanie:**
1. Sprawdź czy secret jest ustawiony w Project Settings
2. Przeładuj edge functions (Deploy > Re-deploy)
3. Sprawdź czy nazwa jest DOKŁADNIE: `RESEND_API_KEY` (wielkie litery!)

### Problem: "Email not sent - Invalid domain"

**Przyczyna:** Domena nadawcy nie jest zweryfikowana w Resend

**Rozwiązanie:**
1. Przejdź do Resend Dashboard > Domains
2. Sprawdź status weryfikacji domeny
3. Tymczasowo użyj `MAIL_FROM=onboarding@resend.dev` do testów

### Problem: Powiadomienia mają status "pending" i nie zmieniają się

**Przyczyna:** Trigger nie działa lub edge function ma błąd

**Rozwiązanie:**
1. Sprawdź logi Postgres - czy trigger się wykonuje?
2. Sprawdź logi Edge Functions - czy są błędy?
3. Ręcznie wywołaj przetwarzanie:
   ```bash
   curl -X POST \
     'https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications' \
     -H 'Authorization: Bearer TWÓJ_SERVICE_ROLE_KEY' \
     -H 'Content-Type: application/json'
   ```

### Problem: Administrator nie dostaje emaili

**Przyczyna:** `ADMIN_EMAIL` nie jest ustawiony lub jest błędny

**Rozwiązanie:**
1. Sprawdź secret `ADMIN_EMAIL` w Project Settings
2. Upewnij się że email jest poprawny
3. Sprawdź spam w skrzynce odbiorczej
4. Sprawdź w Resend Dashboard > Logs czy email został wysłany

### Problem: Klient dostaje email, ale administrator NIE

**Przyczyna:** Brak flagi `sendAdminCopy: true` w wywołaniu

**Rozwiązanie:**
Sprawdź w kodzie formularzy czy mają:
```javascript
sendAdminCopy: true  // To jest KLUCZOWE!
```

Jeśli brak, już zostało naprawione w plikach:
- `src/pages/Contact.jsx`
- `src/pages/Pricing.jsx`
- `src/components/BookingSystem.jsx`

---

## 📊 MONITORING

### Sprawdzanie zaległych powiadomień

```sql
-- Ile powiadomień oczekuje na wysyłkę?
SELECT COUNT(*) as pending_count
FROM notifications
WHERE status = 'pending';

-- Ile zostało wysłanych dzisiaj?
SELECT COUNT(*) as sent_today
FROM notifications
WHERE status = 'sent'
AND sent_at::date = CURRENT_DATE;

-- Które powiadomienia nie zostały wysłane?
SELECT 
  notification_id,
  recipient_email,
  subject,
  status,
  retry_count,
  error_message,
  created_at
FROM notifications
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC
LIMIT 20;
```

### Ręczne przetwarzanie zaległych powiadomień

Jeśli masz dużo zaległych powiadomień (status `pending`):

```bash
# Wywołaj ręcznie przez curl:
curl -X POST \
  'https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications' \
  -H 'Authorization: Bearer TWÓJ_SERVICE_ROLE_KEY' \
  -H 'Content-Type: 'application/json'
```

---

## 🎉 GOTOWE!

Po wykonaniu wszystkich kroków:

✅ Formularze zapisują zgłoszenia do bazy  
✅ System automatycznie tworzy powiadomienia  
✅ Trigger natychmiast je przetwarza  
✅ Resend wysyła emaile do klienta i administratora  
✅ Administrator dostaje powiadomienia o KAŻDYM zgłoszeniu  

---

## 📞 GDZIE SZUKAĆ POMOCY

1. **Resend Docs:** https://resend.com/docs
2. **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
3. **Supabase Triggers:** https://supabase.com/docs/guides/database/postgres/triggers

---

## 📝 CHECKLIST KOŃCOWY

Przed zamknięciem tego zadania, upewnij się że:

- [ ] Klucz API Resend jest ustawiony w Supabase Secrets
- [ ] Domena email jest zweryfikowana w Resend (lub używasz onboarding@resend.dev)
- [ ] `MAIL_FROM` jest ustawiony poprawnie
- [ ] `ADMIN_EMAIL` jest ustawiony na właściwy adres
- [ ] Migracja bazy danych została wykonana
- [ ] Trigger `auto_process_notifications` istnieje i działa
- [ ] Testowe zgłoszenie wysłano i email przyszedł
- [ ] Brak powiadomień ze statusem `failed` w bazie
- [ ] Administrator dostaje wszystkie powiadomienia

---

**Utworzono:** 2025-12-10 12:26  
**Autor:** Kilo Code (AI Assistant)  
**Priorytet:** 🔴 KRYTYCZNY