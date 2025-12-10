-- =====================================================
-- ByteClinic - Naprawa Systemu Powiadomień Email
-- Data: 2025-12-10
-- Cel: Automatyzacja wysyłki powiadomień email przez triggery
-- =====================================================

-- =====================================================
-- 1. WŁĄCZ ROZSZERZENIE pg_net (jeśli dostępne)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- 2. FUNKCJA WYSYŁAJĄCA EMAIL PRZEZ RESEND (z pg_net)
-- =====================================================

CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := current_setting('app.settings.supabase_url', true);
    supabase_key TEXT := current_setting('app.settings.supabase_service_role_key', true);
BEGIN
    -- Sprawdź czy pg_net jest dostępny
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        -- Użyj pg_net do wywołania Edge Function
        BEGIN
            SELECT net.http_post(
                url := supabase_url || '/functions/v1/send-email-resend',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || supabase_key
                ),
                body := jsonb_build_object(
                    'to', NEW.recipient_email,
                    'subject', NEW.subject,
                    'html', NEW.html_content,
                    'text', NEW.text_content
                )
            ) INTO request_id;

            -- Zaktualizuj status na 'sent'
            UPDATE notifications
            SET 
                status = 'sent',
                sent_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.id;

            RAISE NOTICE 'Email wysłany pomyślnie przez pg_net: %', NEW.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- W przypadku błędu, zaktualizuj status na 'failed'
            UPDATE notifications
            SET 
                status = 'failed',
                error_message = SQLERRM,
                retry_count = retry_count + 1,
                updated_at = NOW()
            WHERE id = NEW.id;

            RAISE WARNING 'Błąd wysyłania emaila: %', SQLERRM;
        END;
    ELSE
        -- Jeśli pg_net nie jest dostępny, tylko zaloguj
        RAISE NOTICE 'pg_net nie jest dostępny. Powiadomienie pozostaje w statusie pending: %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. TRIGGER NA TABELI NOTIFICATIONS
-- =====================================================

-- Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;

-- Utwórz nowy trigger który wysyła email po dodaniu nowego powiadomienia
CREATE TRIGGER trigger_send_notification_email
    AFTER INSERT ON notifications
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION send_notification_email();

-- =====================================================
-- 4. FUNKCJA TWORZENIA POWIADOMIENIA DLA NOWEGO ZGŁOSZENIA
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS TRIGGER AS $$
DECLARE
    admin_email TEXT := 'admin@byteclinic.pl';
    notification_subject TEXT;
    notification_html TEXT;
    notification_text TEXT;
    notification_id TEXT;
BEGIN
    -- Generuj notification_id
    notification_id := 'notif_' || extract(epoch from now())::bigint::text || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Przygotuj temat emaila
    notification_subject := '🔔 Nowe zgłoszenie #' || NEW.request_id || ' - ' || COALESCE(NEW.device_type, 'ByteClinic');
    
    -- Przygotuj treść HTML
    notification_html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ByteClinic</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Nowe zgłoszenie</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin-bottom: 20px;">🔔 Nowe zgłoszenie</h2>
            
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #334155;">Szczegóły zgłoszenia:</h3>
                <p style="margin: 5px 0;"><strong>Numer zgłoszenia:</strong> ' || NEW.request_id || '</p>
                <p style="margin: 5px 0;"><strong>Typ:</strong> ' || COALESCE(NEW.type, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Źródło:</strong> ' || COALESCE(NEW.source_page, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Data zgłoszenia:</strong> ' || TO_CHAR(NEW.created_at, 'YYYY-MM-DD HH24:MI') || '</p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #92400e;">👤 Dane klienta</h3>
                <p style="margin: 5px 0;"><strong>Imię:</strong> ' || COALESCE(NEW.customer_name, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:' || NEW.customer_email || '">' || NEW.customer_email || '</a></p>
                <p style="margin: 5px 0;"><strong>Telefon:</strong> <a href="tel:' || COALESCE(NEW.customer_phone, '') || '">' || COALESCE(NEW.customer_phone, 'Nie podano') || '</a></p>
            </div>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af;">💻 Urządzenie</h3>
                <p style="margin: 5px 0;"><strong>Typ:</strong> ' || COALESCE(NEW.device_type, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Model:</strong> ' || COALESCE(NEW.device_model, 'Nie podano') || '</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #334155;">📝 Wiadomość</h3>
                <p style="margin: 5px 0; padding: 15px; background-color: white; border-radius: 6px; border-left: 4px solid #3b82f6;">' || COALESCE(NEW.message, 'Brak treści') || '</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="text-align: center; color: #64748b; margin-top: 30px;">
                    <a href="mailto:' || NEW.customer_email || '" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        📧 Odpowiedz klientowi
                    </a>
                </p>
            </div>
            
            <div style="text-align: center; color: #64748b; margin-top: 30px;">
                <p style="margin: 0; font-size: 14px;">Zgłoszenie z systemu ByteClinic</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Priorytet: <strong>' || COALESCE(NEW.priority, 'normalny') || '</strong></p>
            </div>
        </div>
    </div>';
    
    -- Przygotuj wersję tekstową
    notification_text := 'Nowe zgłoszenie #' || NEW.request_id || E'\n\n' ||
                        'Dane klienta:' || E'\n' ||
                        'Imię: ' || COALESCE(NEW.customer_name, 'Nie podano') || E'\n' ||
                        'Email: ' || NEW.customer_email || E'\n' ||
                        'Telefon: ' || COALESCE(NEW.customer_phone, 'Nie podano') || E'\n\n' ||
                        'Urządzenie:' || E'\n' ||
                        'Typ: ' || COALESCE(NEW.device_type, 'Nie podano') || E'\n' ||
                        'Model: ' || COALESCE(NEW.device_model, 'Nie podano') || E'\n\n' ||
                        'Wiadomość: ' || COALESCE(NEW.message, 'Brak treści') || E'\n\n' ||
                        'Data: ' || TO_CHAR(NEW.created_at, 'YYYY-MM-DD HH24:MI');
    
    -- Wstaw powiadomienie do tabeli notifications
    INSERT INTO notifications (
        notification_id,
        type,
        recipient_email,
        recipient_name,
        subject,
        html_content,
        text_content,
        status,
        data,
        metadata
    ) VALUES (
        notification_id,
        'repair_request',
        admin_email,
        'ByteClinic Admin',
        notification_subject,
        notification_html,
        notification_text,
        'pending',
        json_build_object(
            'request_id', NEW.request_id,
            'customer_name', NEW.customer_name,
            'customer_email', NEW.customer_email,
            'device_type', NEW.device_type
        ),
        json_build_object(
            'source', 'trigger',
            'request_id', NEW.id::text,
            'created_at', NEW.created_at
        )
    );
    
    RAISE NOTICE 'Utworzono powiadomienie dla zgłoszenia: %', NEW.request_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGER NA TABELI REQUESTS
-- =====================================================

-- Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS trigger_notify_new_request ON requests;

-- Utwórz trigger który tworzy powiadomienie po dodaniu nowego zgłoszenia
CREATE TRIGGER trigger_notify_new_request
    AFTER INSERT ON requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_request();

-- =====================================================
-- 6. FUNKCJA DO RĘCZNEGO PONAWIANIA WYSYŁKI
-- =====================================================

CREATE OR REPLACE FUNCTION retry_failed_notifications()
RETURNS TABLE(
    notification_id TEXT,
    status TEXT,
    retry_count INTEGER
) AS $$
BEGIN
    -- Ponów wysyłkę dla powiadomień które nie powiodły się
    -- i nie przekroczyły maksymalnej liczby prób
    UPDATE notifications
    SET 
        status = 'pending',
        updated_at = NOW()
    WHERE 
        notifications.status = 'failed' 
        AND notifications.retry_count < notifications.max_retries
        AND notifications.created_at > NOW() - INTERVAL '24 hours';
    
    -- Zwróć listę powiadomień które będą ponowione
    RETURN QUERY
    SELECT 
        n.notification_id::TEXT,
        n.status::TEXT,
        n.retry_count
    FROM notifications n
    WHERE 
        n.status = 'pending'
        AND n.retry_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNKCJA DO SPRAWDZANIA STATUSU POWIADOMIEŃ
-- =====================================================

CREATE OR REPLACE FUNCTION get_notification_stats()
RETURNS TABLE(
    total_notifications BIGINT,
    pending_count BIGINT,
    sent_count BIGINT,
    failed_count BIGINT,
    delivered_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count
    FROM notifications;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. INDEKSY DLA WYDAJNOŚCI
-- =====================================================

-- Indeks dla szybkiego wyszukiwania powiadomień do wysłania
CREATE INDEX IF NOT EXISTS idx_notifications_pending 
ON notifications(status, created_at) 
WHERE status = 'pending';

-- Indeks dla nieudanych powiadomień wymagających ponowienia
CREATE INDEX IF NOT EXISTS idx_notifications_failed_retry 
ON notifications(status, retry_count, created_at) 
WHERE status = 'failed';

-- =====================================================
-- 9. POLITYKI RLS DLA AUTOMATYZACJI
-- =====================================================

-- Pozwól service_role na wszystkie operacje
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'notifications' 
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access"
            ON notifications
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- 10. KOMENTARZE DOKUMENTACYJNE
-- =====================================================

COMMENT ON FUNCTION send_notification_email() IS 'Automatycznie wysyła email przez Resend po dodaniu nowego powiadomienia (wymaga pg_net)';
COMMENT ON FUNCTION notify_new_request() IS 'Tworzy powiadomienie email dla administratora po dodaniu nowego zgłoszenia';
COMMENT ON FUNCTION retry_failed_notifications() IS 'Ponawia wysyłkę nieudanych powiadomień (max 3 próby)';
COMMENT ON FUNCTION get_notification_stats() IS 'Zwraca statystyki powiadomień email';

-- =====================================================
-- 11. WERYFIKACJA
-- =====================================================

-- Sprawdź czy triggery zostały utworzone
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_statement,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name IN ('trigger_send_notification_email', 'trigger_notify_new_request')
ORDER BY trigger_name;

-- Sprawdź czy pg_net jest dostępny
SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') as pg_net_available;

-- Sprawdź statystyki powiadomień
SELECT * FROM get_notification_stats();

-- =====================================================
-- KONIEC MIGRACJI
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Migracja systemu powiadomień została pomyślnie wykonana!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Utworzono:';
    RAISE NOTICE '  - Funkcję send_notification_email() - automatyczna wysyłka przez Resend (wymaga pg_net)';
    RAISE NOTICE '  - Funkcję notify_new_request() - tworzenie powiadomień dla zgłoszeń';
    RAISE NOTICE '  - Trigger trigger_send_notification_email - wysyłka po dodaniu do notifications';
    RAISE NOTICE '  - Trigger trigger_notify_new_request - powiadomienie po dodaniu do requests';
    RAISE NOTICE '  - Funkcję retry_failed_notifications() - ponowienie nieudanych wysyłek';
    RAISE NOTICE '  - Funkcję get_notification_stats() - statystyki powiadomień';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'WAŻNE UWAGI:';
    RAISE NOTICE '  1. ZMIEŃ admin_email w funkcji notify_new_request() na właściwy adres';
    RAISE NOTICE '  2. Jeśli pg_net nie jest dostępny, powiadomienia będą w statusie "pending"';
    RAISE NOTICE '  3. W takim przypadku użyj Edge Function do okresowego przetwarzania pending notifications';
    RAISE NOTICE '=====================================================';
END $$;