-- ============================================================================
-- Production-ready Database Webhook for notifications
-- Data: 2025-12-10
-- Autor: Kilo Code
--
-- Cel: Zastąpić trigger oparty o net.http_post stabilnym webhooks
--      (supabase_functions.http_request) dla tabeli notifications.
-- Wymagania:
--   - Plan Pro (Database Webhooks / pg_net dostępny)
--   - Ustawione GUC z danymi uwierzytelniającymi (patrz instrukcje)
-- ============================================================================

BEGIN;

-- Zapewnij dostępność pg_net/supabase_functions (niezbędne dla webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Usuń poprzedni trigger bazujący na net.http_post
DROP TRIGGER IF EXISTS auto_process_notifications ON public.notifications;
DROP FUNCTION IF EXISTS public.trigger_process_pending_notifications();

-- Nowa funkcja wywołująca Edge Function przez Database Webhook
CREATE OR REPLACE FUNCTION public.notifications_webhook_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_raw text := current_setting('app.settings', true);
  settings jsonb := CASE WHEN settings_raw IS NOT NULL THEN settings_raw::jsonb ELSE NULL END;
  supabase_url text := COALESCE(
    current_setting('app.settings.supabase_url', true),
    CASE WHEN settings IS NOT NULL AND settings ? 'supabase_url' THEN settings->>'supabase_url' END,
    'https://wllxicmacmfzmqdnovhp.supabase.co'
  );
  service_role_key text := COALESCE(
    current_setting('app.settings.service_role_key', true),
    CASE WHEN settings IS NOT NULL AND settings ? 'service_role_key' THEN settings->>'service_role_key' END,
    ''
  );
  headers jsonb;
  payload jsonb;
BEGIN
  IF service_role_key = '' THEN
    RAISE WARNING 'Service Role Key nie jest skonfigurowany w app.settings.service_role_key. Webhook pominięty.';
    RETURN NEW;
  END IF;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
  );

  payload := jsonb_build_object(
    'event', 'notifications.insert',
    'source', 'database-webhook',
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'record_id', NEW.notification_id,
    'record', row_to_json(NEW)
  );

  PERFORM supabase_functions.http_request(
    supabase_url || '/functions/v1/process-pending-notifications',
    'POST',
    headers,
    payload::text,
    '5000'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notifications_webhook_dispatch() IS
  'Database Webhook: wysyła INSERT z notifications do process-pending-notifications przez supabase_functions.http_request';

-- Trigger korzystający z nowej funkcji (tylko rekordy pending)
CREATE TRIGGER auto_process_notifications
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notifications_webhook_dispatch();

COMMENT ON TRIGGER auto_process_notifications ON public.notifications IS
  'Database Webhook → process-pending-notifications (INSERT + status pending)';

COMMIT;
