-- ============================================================================
-- Automatyczne przetwarzanie powiadomień email
-- Data: 2025-12-10
-- Autor: Kilo Code
--
-- Cel: Automatyczne wywoływanie edge function process-pending-notifications
--      gdy nowe powiadomienie z statusem 'pending' zostanie dodane do tabeli
-- ============================================================================

-- Krok 1: Włącz rozszerzenie http (jeśli jeszcze nie jest włączone)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Krok 2: Funkcja do wywoływania edge function
CREATE OR REPLACE FUNCTION public.trigger_process_pending_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Wykonuje się z uprawnieniami właściciela funkcji
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_key text;
  request_id bigint;
BEGIN
  -- Pobierz URL Supabase z bazy (ustaw w Project Settings jeśli używasz)
  -- Alternatywnie: hardcode URL twojego projektu
  supabase_url := current_setting('app.settings', true)::json->>'supabase_url';
  service_key := current_setting('app.settings', true)::json->>'service_role_key';
  
  -- Jeśli settings nie są ustawione, użyj domyślnych wartości
  -- WAŻNE: Zamień te wartości na swoje przed wykonaniem migracji!
  IF supabase_url IS NULL THEN
    supabase_url := 'https://wllxicmacmfzmqdnovhp.supabase.co';
  END IF;
  
  -- Wywołaj edge function asynchronicznie (nie czekamy na odpowiedź)
  -- Używamy extensions.http_post z rozszerzenia http
  BEGIN
    SELECT extensions.http_post(
      url := supabase_url || '/functions/v1/process-pending-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || COALESCE(service_key, ''),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    ) INTO request_id;
    
    RAISE LOG 'Triggered notification processing for notification_id: %', NEW.notification_id;
  EXCEPTION WHEN OTHERS THEN
    -- Loguj błąd ale nie przerywaj transakcji
    RAISE WARNING 'Failed to trigger notification processing: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Dodaj komentarz do funkcji
COMMENT ON FUNCTION public.trigger_process_pending_notifications() IS 
'Automatycznie wywołuje edge function process-pending-notifications gdy nowe powiadomienie jest dodawane';

-- Krok 3: Utwórz trigger na tabeli notifications
DROP TRIGGER IF EXISTS auto_process_notifications ON public.notifications;

CREATE TRIGGER auto_process_notifications
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.trigger_process_pending_notifications();

-- Dodaj komentarz do triggera
COMMENT ON TRIGGER auto_process_notifications ON public.notifications IS 
'Automatycznie przetwarza nowe powiadomienia ze statusem pending';

-- ============================================================================
-- ALTERNATYWNE ROZWIĄZANIE: Cron Job (jeśli trigger nie działa)
-- Odkomentuj poniższy kod jeśli wolisz użyć cron job zamiast triggera
-- ============================================================================

/*
-- Włącz rozszerzenie pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Utwórz cron job który uruchamia się co 5 minut
SELECT cron.schedule(
  'process-pending-notifications-job',
  '*/5 * * * *', -- Co 5 minut
  $$
  SELECT extensions.http_post(
    url := 'https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Sprawdź status cron jobs
SELECT * FROM cron.job WHERE jobname = 'process-pending-notifications-job';

-- Aby usunąć cron job (jeśli potrzeba):
-- SELECT cron.unschedule('process-pending-notifications-job');
*/

-- ============================================================================
-- Weryfikacja instalacji
-- ============================================================================

-- Sprawdź czy trigger został utworzony
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_process_notifications';

-- Sprawdź czy funkcja istnieje
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'trigger_process_pending_notifications';

-- ============================================================================
-- Test triggera (opcjonalny)
-- ============================================================================

/*
-- Wstaw testowe powiadomienie żeby sprawdzić czy trigger działa
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

-- Sprawdź logi (w Supabase Dashboard > Logs > Edge Functions)
*/

-- ============================================================================
-- WAŻNE UWAGI
-- ============================================================================

-- 1. MUSISZ skonfigurować secrets w Supabase:
--    - RESEND_API_KEY
--    - MAIL_FROM
--    - ADMIN_EMAIL

-- 2. Jeśli używasz triggera z http_post, upewnij się że:
--    - Rozszerzenie http jest włączone
--    - URL Supabase jest poprawny
--    - Edge function process-pending-notifications jest wdrożona

-- 3. Trigger wykonuje się asynchronicznie - błędy nie przerywają zapisu
--    do tabeli notifications

-- 4. Możesz monitorować działanie w:
--    - Supabase Dashboard > Logs > Postgres Logs
--    - Supabase Dashboard > Logs > Edge Functions

-- 5. Jeśli trigger nie działa, użyj alternatywnego rozwiązania z cron job