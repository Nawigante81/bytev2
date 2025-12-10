# Instrukcja konfiguracji środowiska produkcyjnego

## 🎯 Cel

Skonfigurować środowisko produkcyjne dla systemu automatycznych powiadomień email.

## 📋 Krok po kroku

### 1. Włącz rozszerzenie pg_net

```sql
-- W Supabase Dashboard > SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

### 2. Ustaw GUC z service_role_key

```sql
-- W Supabase Dashboard > SQL Editor
ALTER DATABASE postgres SET app.settings = '{"service_role_key":"<YOUR_SERVICE_ROLE_KEY>"}';
```

**UWAGA:** Zastąp `<YOUR_SERVICE_ROLE_KEY>` rzeczywistym kluczem z Supabase.

### 3. Restart connection pool

1. Przejdź do **Database > Connection Pooling**
2. Kliknij **"Restart Pool"**

### 4. Skonfiguruj secrets w Supabase

1. Przejdź do **Project Settings > Secrets**
2. Dodaj następujące secrets:
   - `RESEND_API_KEY`: Twój klucz API z Resend.com
   - `MAIL_FROM`: Adres email nadawcy (np. "kontakt@byteclinic.pl")
   - `ADMIN_EMAIL`: Adres email administratora

### 5. Uruchom migrację triggera

Wklej zawartość pliku: `supabase/migrations/20251210_setup_auto_notifications.sql`

### 6. Weryfikacja konfiguracji

```sql
-- Sprawdź czy GUC jest poprawnie ustawiony
SELECT current_setting('app.settings', true) AS service_role_key_config;

-- Sprawdź czy pg_net jest dostępny
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';
```

### 7. Test systemu

```sql
-- Wstaw testowe powiadomienie
INSERT INTO public.notifications (
  notification_id,
  type,
  recipient_email,
  recipient_name,
  subject,
  html_content,
  text_content,
  status,
  data
) VALUES (
  'test_' || gen_random_uuid()::text,
  'test',
  'test@example.com',
  'Test User',
  'Test Notification',
  '<p>This is a test</p>',
  'This is a test',
  'pending',
  '{}'::jsonb
);
```

## ✅ Potwierdzenie sukcesu

- Sprawdź logi w **Supabase Dashboard > Logs > Edge Functions**
- Powinieneś zobaczyć wywołanie `process-pending-notifications`
- Email powinien zostać wysłany przez Resend

## 💡 Wskazówki

- Jeśli trigger nie działa, sprawdź czy migracja została poprawnie zastosowana
- Upewnij się, że wszystkie secrets są poprawnie skonfigurowane
- W przypadku problemów, sprawdź logi Postgres i Edge Functions