-- ============================================================================
-- Automatyczne przetwarzanie powiadomień email
-- Data: 2025-12-10
-- Autor: Kilo Code
-- Wersja: Production-Ready (po optymalizacji)
--
-- Cel: Automatyczne wywoływanie edge function process-pending-notifications
--      gdy nowe powiadomienie z statusem 'pending' zostanie dodane do tabeli
--
-- UWAGA BEZPIECZEŃSTWA: Service Role Key w triggerze jest wrażliwy.
-- W production rozważ: Database Webhooks, IP-based auth lub JWT signing.
-- ============================================================================

-- Krok 1: Włącz rozszerzenie pg_net (jeśli jeszcze nie jest włączone)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Krok 2: Funkcja do wywoływania edge function (optymalizowana wersja)
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
  -- Wywołaj edge function asynchronicznie
  -- UWAGA: extensions.http może być niestabilny w produkcji
  -- Rozważ Database Webhooks lub Supabase Functions Scheduler jako alternatywę
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/process-pending-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || COALESCE(service_key, ''),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('notification_id', NEW.notification_id)::text,
      timeout_milliseconds := 2000
    );

    RAISE LOG 'Triggered process-pending-notifications for %', NEW.notification_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Edge call failed: %', SQLERRM;
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

-- Włącz rozszerzenie pg_cron
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Utwórz cron job który uruchamia się co 5 minut
-- SELECT cron.schedule(
--   'process-pending-notifications-job',
--   '*/5 * * * *',
--   $$
--   SELECT extensions.http_post(
--     url := 'https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 30000
--   );
--   $$
-- );

-- Sprawdź status cron jobs
-- SELECT * FROM cron.job WHERE jobname = 'process-pending-notifications-job';

-- Aby usunąć cron job (jeśli potrzeba):
-- SELECT cron.unschedule('process-pending-notifications-job');

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

-- Wstaw testowe powiadomienie żeby sprawdzić czy trigger działa
-- INSERT INTO public.notifications (
--   notification_id,
--   type,
--   recipient_email,
--   recipient_name,
--   subject,
--   html_content,
--   text_content,
--   status,
--   data
-- ) VALUES (
--   'test_' || gen_random_uuid()::text,
--   'test',
--   'test@example.com',
--   'Test User',
--   'Test Notification',
--   '<p>This is a test</p>',
--   'This is a test',
--   'pending',
--   '{}'::jsonb
-- );

-- Sprawdź logi (w Supabase Dashboard > Logs > Edge Functions)

-- ============================================================================
-- WAŻNE UWAGI I BEZPIECZEŃSTWO
-- ============================================================================

-- 1. MUSISZ skonfigurować secrets w Supabase:
--    - RESEND_API_KEY
--    - MAIL_FROM
--    - ADMIN_EMAIL

-- 2. SERVICE ROLE KEY - BEZPIECZEŃSTWO:
--    - SRK w triggerze to ryzyko (full access, plain text w bazie)
--    - Rozważ JWT signing secret lub IP-based auth dla edge function
--    - Możesz ustawić GUC: ALTER DATABASE postgres SET app.settings = '{"service_role_key": "..."}';
--    - Jeśli używasz GUC, restart connection pool może być wymagany

-- 3. net.http_post MOŻE BYĆ NIESTABILNY:
--    - To "use at your own risk" - niektóre requesty mogą zaginąć
--    - W production: Database Webhooks lub Supabase Functions Scheduler
--    - Trigger daje real-time, ale może wymagać fallback (cron)

-- 4. Timeout na 2000ms:
--    - Wystarczająco krótki (trigger nie czeka)
--    - Jeśli edge function spi → warning, transakcja przechodzi
--    - request_id z net.http_post to fake integer (nie realny request ID)

-- 5. Monitoring:
--    - Supabase Dashboard > Logs > Postgres Logs (triggery, errory)
--    - Supabase Dashboard > Logs > Edge Functions (wywołania)
--    - notification_id jest przekazywane w body dla łatwiejszego debugowania

-- 6. Alternatywy (jeśli trigger nie działa):
--    - Cron job (polling co 2-5 min) - odkomentuj sekcję powyżej
--    - Database Webhooks (najbardziej stabilne)
--    - Realtime subscriptions + edge function
--    - Scheduler w Supabase Functions (oficjalnie wspierany)