-- ═══════════════════════════════════════════════════════════════════════════════
-- INSTRUKCJA KONFIGURACJI POWIADOMIEŃ EMAIL O NOWYCH ZGŁOSZENIACH
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- WYMAGANIA:
-- 1. Wdrożona funkcja Edge "notify-new-diagnosis" (patrz DEPLOY-INSTRUCTIONS.md)
-- 2. Ustawione sekrety w Edge Function:
--    - RESEND_API_KEY
--    - MAIL_FROM  
--    - ADMIN_EMAIL
-- 3. Uprawnienia http w Supabase (domyślnie włączone)
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- OPCJA 1: Webhook przez panel Supabase (ZALECANE - łatwiejsze)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Zamiast SQL, użyj panelu Supabase:
-- Database → Webhooks → Create a new hook
--
-- Ustawienia:
--   Name: notify-new-diagnosis
--   Table: diagnosis_requests
--   Events: ✓ Insert
--   Type: HTTP Request
--   Method: POST
--   URL: https://[TWÓJ-PROJECT-REF].supabase.co/functions/v1/notify-new-diagnosis
--   Headers:
--     Content-Type: application/json
--     Authorization: Bearer [TWÓJ-ANON-KEY]
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- OPCJA 2: Trigger SQL (jeśli wolisz kod)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Włącz rozszerzenie http (jeśli nie jest włączone)
CREATE EXTENSION IF NOT EXISTS http;

-- Funkcja triggerowa wywołująca Edge Function
CREATE OR REPLACE FUNCTION notify_new_diagnosis_trigger()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  edge_function_url TEXT;
  anon_key TEXT;
  response_status INT;
BEGIN
  -- ⚠️ ZAMIEŃ NA SWOJE WARTOŚCI:
  edge_function_url := 'https://TWÓJ-PROJECT-REF.supabase.co/functions/v1/notify-new-diagnosis';
  anon_key := 'TWÓJ-ANON-KEY';
  
  -- Wywołaj Edge Function asynchronicznie (nie czekamy na odpowiedź)
  PERFORM http_post(
    edge_function_url,
    jsonb_build_object('record', row_to_json(NEW)),
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || anon_key),
      http_header('Content-Type', 'application/json')
    ]::http_header[]
  );
  
  -- Zawsze zwróć NEW (nie blokuj wstawienia rekordu)
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- W razie błędu loguj ale nie blokuj operacji
  RAISE WARNING 'notify_new_diagnosis_trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Utwórz trigger na tabeli diagnosis_requests
DROP TRIGGER IF EXISTS on_diagnosis_insert ON diagnosis_requests;

CREATE TRIGGER on_diagnosis_insert
  AFTER INSERT ON diagnosis_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_diagnosis_trigger();

-- ═══════════════════════════════════════════════════════════════════════════════
-- TESTOWANIE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Sprawdź czy trigger istnieje
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_diagnosis_insert';

-- Test 2: Wstaw testowe zgłoszenie (usuń po teście!)
/*
INSERT INTO diagnosis_requests (name, email, phone, device, message, consent)
VALUES (
  'Test Testowy',
  'test@example.com',
  '+48123456789',
  'laptop',
  'To jest testowe zgłoszenie - można usunąć',
  true
);

-- Po teście usuń testowy rekord:
DELETE FROM diagnosis_requests WHERE name = 'Test Testowy';
*/

-- Test 3: Sprawdź logi triggerów (jeśli są dostępne)
-- W panelu Supabase: Database → Database Webhooks → Logs

-- ═══════════════════════════════════════════════════════════════════════════════
-- DEZAKTYWACJA (jeśli chcesz wyłączyć powiadomienia)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Usuń trigger:
-- DROP TRIGGER IF EXISTS on_diagnosis_insert ON diagnosis_requests;
-- DROP FUNCTION IF EXISTS notify_new_diagnosis_trigger();

-- ═══════════════════════════════════════════════════════════════════════════════
-- UWAGI
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 1. Webhook przez panel jest BEZPIECZNIEJSZY - nie musisz hardcodować kluczy w SQL
-- 2. Anon key znajdziesz w: Settings → API → Project API keys
-- 3. Project ref znajdziesz w URL panelu: https://supabase.com/dashboard/project/[TO-JEST-REF]
-- 4. Jeśli email nie przychodzi, sprawdź:
--    - Logi Edge Function: supabase functions logs notify-new-diagnosis
--    - Czy sekrety są ustawione (RESEND_API_KEY, ADMIN_EMAIL)
--    - Folder SPAM w emailu
--
-- ═══════════════════════════════════════════════════════════════════════════════
