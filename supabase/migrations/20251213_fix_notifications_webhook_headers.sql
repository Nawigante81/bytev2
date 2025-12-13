-- Ensure notifications database webhook sends both Authorization + apikey headers.
-- This avoids 401 when the Edge Functions gateway expects apikey.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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
    ''
  );
  service_role_key text := COALESCE(
    current_setting('app.settings.service_role_key', true),
    CASE WHEN settings IS NOT NULL AND settings ? 'service_role_key' THEN settings->>'service_role_key' END,
    ''
  );
  headers jsonb;
  payload jsonb;
BEGIN
  IF supabase_url = '' THEN
    RAISE WARNING 'Supabase URL nie jest skonfigurowany w app.settings.supabase_url. Webhook pominięty.';
    RETURN NEW;
  END IF;

  IF service_role_key = '' THEN
    RAISE WARNING 'Service Role Key nie jest skonfigurowany w app.settings.service_role_key. Webhook pominięty.';
    RETURN NEW;
  END IF;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key,
    'apikey', service_role_key
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

COMMIT;

