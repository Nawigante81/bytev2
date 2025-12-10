-- ============================================================================
-- Skrypt konfiguracyjny dla środowiska produkcyjnego
-- Data: 2025-12-10
-- Autor: Kilo Code
-- Cel: Konfiguracja GUC, pg_net i secrets dla systemu powiadomień
-- ============================================================================

-- Krok 1: Włącz rozszerzenie pg_net (jeśli jeszcze nie jest włączone)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Krok 2: Ustaw GUC z service_role_key
-- Zastąp <YOUR_SERVICE_ROLE_KEY> rzeczywistym kluczem z Supabase
ALTER DATABASE postgres SET app.settings = '{"service_role_key":"<YOUR_SERVICE_ROLE_KEY>"}';

-- Krok 3: Restart connection pool (wymagane dla GUC)
-- W Supabase Dashboard:
-- 1. Przejdź do Database > Connection Pooling
-- 2. Kliknij "Restart Pool"

-- Krok 4: Skonfiguruj secrets w Supabase (wykonać w Dashboard)
-- 1. Przejdź do Project Settings > Secrets
-- 2. Dodaj następujące secrets:
--    - RESEND_API_KEY: Twój klucz API z Resend.com
--    - MAIL_FROM: Adres email nadawcy (np. "kontakt@byteclinic.pl")
--    - ADMIN_EMAIL: Adres email administratora

-- Krok 5: Weryfikacja konfiguracji
-- Sprawdź czy GUC jest poprawnie ustawiony
SELECT current_setting('app.settings', true) AS service_role_key_config;

-- Sprawdź czy pg_net jest dostępny
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';

-- Krok 6: Uruchom migrację triggera (jeśli jeszcze nie została uruchomiona)
-- Wklej zawartość pliku: supabase/migrations/20251210_setup_auto_notifications.sql

-- Krok 7: Test systemu
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

-- Sprawdź logi w Supabase Dashboard > Logs > Edge Functions