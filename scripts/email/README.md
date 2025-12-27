# Email Scripts - ByteClinic

Narzędzia diagnostyczne i testowe dla systemu powiadomień email.

## Szybki start

### Sprawdź status systemu email
```bash
node scripts/email/check-email-status.js
```

Ten skrypt pokazuje:
- ✅ Statystyki z ostatnich 24 godzin
- ⏳ Ile powiadomień oczekuje na wysłanie
- ❌ Ile powiadomień nie powiodło się
- 📋 Ostatnie 5 powiadomień z statusami
- ⚙️  Lista wymaganych zmiennych w Supabase Secrets

### Pełna diagnostyka systemu
```bash
node scripts/email/diagnoza-email-system.js
```

Ten skrypt sprawdza:
1. Zmienne środowiskowe w .env
2. Dostępność Edge Functions
3. Tabela notifications (statusy)
4. Test wywołania notify-system
5. Supabase Secrets (wymaga weryfikacji manualnej)
6. Test Resend API (z lokalnego .env)
7. Rekomendacje naprawcze

### Kompleksowy test email
```bash
node scripts/email/comprehensive-email-test.js
```

## Typowe problemy i rozwiązania

### 1. Powiadomienia w statusie "pending"

**Objawy:**
```
⏳ Oczekujących: 10
```

**Przyczyna:**
- `process-pending-notifications` nie działa
- Brak RESEND_API_KEY w Supabase Secrets

**Rozwiązanie:**
1. Sprawdź Supabase Dashboard → Settings → Edge Functions → Secrets
2. Dodaj RESEND_API_KEY
3. Wdróż ponownie: `supabase functions deploy process-pending-notifications`
4. Uruchom ręcznie:
```bash
curl -X POST https://[projekt].supabase.co/functions/v1/process-pending-notifications \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json"
```

### 2. Wszystkie powiadomienia failed

**Objawy:**
```
❌ Nieudanych: 15
Przykładowe błędy:
- test@example.com: Resend API error: 403 - Invalid API key
```

**Przyczyna:**
- Nieprawidłowy RESEND_API_KEY
- Klucz API wygasł

**Rozwiązanie:**
1. Przejdź do [Resend Dashboard](https://resend.com/api-keys)
2. Wygeneruj nowy klucz API
3. Zaktualizuj w Supabase Secrets
4. Wdróż ponownie edge functions

### 3. Administrator nie dostaje emaili

**Objawy:**
- Klient dostaje email potwierdzający
- Administrator nie dostaje kopii

**Przyczyna:**
- ADMIN_EMAIL nie jest ustawiony w Supabase Secrets
- ADMIN_EMAIL wskazuje na nieprawidłowy adres

**Rozwiązanie:**
1. Ustaw ADMIN_EMAIL w Supabase Secrets (np. `serwis@byteclinic.pl`)
2. Wdróż ponownie: `supabase functions deploy notify-system`
3. Sprawdź czy email nie trafia do SPAM
4. Fallback email (`kontakt@byteclinic.pl`) też powinien dostać kopię

### 4. Emaile nie docierają (wysłane, ale nie w skrzynce)

**Objawy:**
```
✅ Wysłanych: 20 (100%)
```
Ale emaile nie są w skrzynce odbiorczej.

**Przyczyna:**
- Emaile w folderze SPAM
- Niezweryfikowana domena w Resend
- Brak SPF/DKIM/DMARC records

**Rozwiązanie:**
1. Sprawdź folder SPAM
2. Zweryfikuj domenę w [Resend Dashboard](https://resend.com/domains)
3. Dodaj DNS records:
   - SPF: `v=spf1 include:resend.com ~all`
   - DKIM: (podany w Resend Dashboard)
   - DMARC: `v=DMARC1; p=none; rua=mailto:admin@byteclinic.pl`
4. Użyj zweryfikowanej domeny w MAIL_FROM

## Wymagane zmienne środowiskowe

### W .env (lokalnie, do testów)
```env
VITE_SUPABASE_URL=https://[projekt].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
RESEND_API_KEY=re_...
```

### W Supabase Edge Functions Secrets (produkcja)
```
ADMIN_EMAIL=serwis@byteclinic.pl
RESEND_API_KEY=re_...
MAIL_FROM=serwis@byteclinic.pl
SUPABASE_URL=https://[projekt].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**WAŻNE:** Po dodaniu/zmianie secrets, **zawsze wdróż ponownie** edge functions!

## Architektura systemu email

```
┌─────────────────┐
│ Formularz       │
│ kontaktowy      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ notify-system   │ ← Edge Function
│ (Edge Function) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ notifications   │ ← Tabela w Supabase
│ (tabela)        │   Status: pending
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ process-pending-        │ ← Edge Function
│ notifications           │   Wywoływana automatycznie
│ (Edge Function)         │   lub ręcznie
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│ Resend API      │ ← Zewnętrzny serwis
│ (wysyłka)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Skrzynka email  │
│ (klient, admin) │
└─────────────────┘
```

## Limity Resend

### Plan Free
- ✅ 100 emaili/dzień
- ✅ 2 requesty/sekundę
- ✅ 1 zweryfikowana domena
- ❌ Brak custom domeny (tylko onboarding@resend.dev)

### Plan Pro ($20/miesiąc)
- ✅ 50,000 emaili/miesiąc
- ✅ 10 requestów/sekundę
- ✅ Custom domain
- ✅ Webhook events
- ✅ Email analytics

## Monitoring

### Logi Edge Functions
1. Supabase Dashboard → Edge Functions
2. Wybierz funkcję
3. Kliknij "Logs"

### Zapytania SQL

**Pokaż ostatnie powiadomienia:**
```sql
SELECT 
  notification_id,
  type,
  recipient_email,
  status,
  created_at,
  sent_at,
  error_message
FROM notifications
ORDER BY created_at DESC
LIMIT 20;
```

**Statystyki:**
```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

**Nieudane powiadomienia:**
```sql
SELECT 
  notification_id,
  recipient_email,
  subject,
  retry_count,
  error_message
FROM notifications
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## Wsparcie

Jeśli nadal masz problemy:

1. Sprawdź [docs/FIX_EMAIL_CONTACT_FORM.md](../../docs/FIX_EMAIL_CONTACT_FORM.md)
2. Uruchom `node scripts/email/diagnoza-email-system.js`
3. Sprawdź logi Edge Functions w Supabase Dashboard
4. Sprawdź tabelę `notifications` w bazie danych
5. Zweryfikuj wszystkie secrets w Supabase

---

**Ostatnia aktualizacja:** 2025-12-27
