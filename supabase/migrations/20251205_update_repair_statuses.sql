-- =====================================================
-- Aktualizacja statusów napraw - ByteClinic
-- Data: 2025-12-05
-- Cel: Dostosowanie statusów do wymagań biznesowych
-- =====================================================

-- =====================================================
-- 1. AKTUALIZACJA KONSTRUKTORA TABELI REPAIRS
-- =====================================================

-- Usuń stare ograniczenia
ALTER TABLE repairs DROP CONSTRAINT IF EXISTS chk_status_repair;

-- Dodaj nowe statusy zgodnie z wymaganiami
ALTER TABLE repairs ADD CONSTRAINT chk_status_repair_new 
    CHECK (status IN (
        'new_request',      -- Nowe zgłoszenie
        'open',             -- Otwarte  
        'in_repair',        -- W trakcie naprawy
        'waiting_for_parts', -- Oczekiwanie na części
        'repair_completed', -- Naprawa zakończona
        'ready_for_pickup'  -- Gotowe do odbioru
    ));

-- =====================================================
-- 2. AKTUALIZACJA TABELI REPAIR_TIMELINE  
-- =====================================================

-- Usuń stare ograniczenia
ALTER TABLE repair_timeline DROP CONSTRAINT IF EXISTS chk_timeline_status;

-- Dodaj nowe statusy dla osi czasu
ALTER TABLE repair_timeline ADD CONSTRAINT chk_timeline_status_new
    CHECK (status IN (
        'new_request',      -- Nowe zgłoszenie
        'open',             -- Otwarte  
        'in_repair',        -- W trakcie naprawy
        'waiting_for_parts', -- Oczekiwanie na części
        'repair_completed', -- Naprawa zakończona
        'ready_for_pickup'  -- Gotowe do odbioru
    ));

-- =====================================================
-- 3. FUNKCJA MIGRUJĄCA DANE
-- =====================================================

-- Funkcja do migracji starych statusów na nowe
CREATE OR REPLACE FUNCTION migrate_repair_statuses()
RETURNS void AS $$
BEGIN
    -- Migracja statusów w tabeli repairs
    UPDATE repairs SET status = 'new_request' WHERE status = 'received';
    UPDATE repairs SET status = 'open' WHERE status = 'diagnosed';
    UPDATE repairs SET status = 'in_repair' WHERE status = 'in_progress';
    UPDATE repairs SET status = 'repair_completed' WHERE status = 'completed';
    UPDATE repairs SET status = 'ready_for_pickup' WHERE status = 'ready';
    UPDATE repairs SET status = 'in_repair' WHERE status = 'testing';
    
    -- Migracja statusów w tabeli repair_timeline
    UPDATE repair_timeline SET status = 'new_request' WHERE status = 'received';
    UPDATE repair_timeline SET status = 'open' WHERE status = 'diagnosed';
    UPDATE repair_timeline SET status = 'in_repair' WHERE status = 'in_progress';
    UPDATE repair_timeline SET status = 'repair_completed' WHERE status = 'completed';
    UPDATE repair_timeline SET status = 'ready_for_pickup' WHERE status = 'ready';
    UPDATE repair_timeline SET status = 'in_repair' WHERE status = 'testing';
    
    RAISE NOTICE 'Migrowano statusy napraw do nowych wartości';
END;
$$ LANGUAGE plpgsql;

-- Wykonaj migrację
SELECT migrate_repair_statuses();

-- =====================================================
-- 4. FUNKCJE POMOCNICZE
-- =====================================================

-- Funkcja do pobierania polskiej etykiety statusu
CREATE OR REPLACE FUNCTION get_repair_status_label(status_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE status_text
        WHEN 'new_request' THEN 'Nowe zgłoszenie'
        WHEN 'open' THEN 'Otwarte'
        WHEN 'in_repair' THEN 'W trakcie naprawy'
        WHEN 'waiting_for_parts' THEN 'Oczekiwanie na części'
        WHEN 'repair_completed' THEN 'Naprawa zakończona'
        WHEN 'ready_for_pickup' THEN 'Gotowe do odbioru'
        ELSE status_text
    END;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do obliczania postępu naprawy na podstawie statusu
CREATE OR REPLACE FUNCTION get_repair_progress(status_text TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE status_text
        WHEN 'new_request' THEN 10
        WHEN 'open' THEN 25
        WHEN 'waiting_for_parts' THEN 40
        WHEN 'in_repair' THEN 70
        WHEN 'repair_completed' THEN 90
        WHEN 'ready_for_pickup' THEN 100
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNKCJE DLA APLIKACJI
-- =====================================================

-- Funkcja do pobierania napraw klienta z nowymi statusami
CREATE OR REPLACE FUNCTION get_customer_repairs_new(customer_email_param TEXT)
RETURNS TABLE (
    repair_id TEXT,
    device_model TEXT,
    issue_description TEXT,
    status TEXT,
    status_label TEXT,
    progress INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.repair_id, 
        r.device_model, 
        r.issue_description, 
        r.status::TEXT,
        get_repair_status_label(r.status) as status_label,
        get_repair_progress(r.status) as progress,
        r.created_at, 
        r.estimated_completion
    FROM repairs r
    WHERE r.customer_email = customer_email_param
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do aktualizacji statusu naprawy z logowaniem
CREATE OR REPLACE FUNCTION update_repair_status(
    repair_id_param UUID,
    new_status TEXT,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    repair_record repairs%ROWTYPE;
BEGIN
    -- Sprawdź czy naprawa istnieje
    SELECT * INTO repair_record FROM repairs WHERE id = repair_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Naprawa o ID % nie istnieje', repair_id_param;
    END IF;
    
    -- Aktualizuj status naprawy
    UPDATE repairs 
    SET 
        status = new_status,
        progress = get_repair_progress(new_status),
        updated_at = NOW()
    WHERE id = repair_id_param;
    
    -- Dodaj wpis do osi czasu
    INSERT INTO repair_timeline (
        repair_id,
        status,
        title,
        description,
        notes,
        created_at
    ) VALUES (
        repair_id_param,
        new_status,
        'Aktualizacja statusu',
        COALESCE(notes, 'Status naprawy został zaktualizowany'),
        notes,
        NOW()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGERY I FUNKCJE AUTOMATYCZNE
-- =====================================================

-- Trigger do automatycznego ustawiania postępu przy zmianie statusu
CREATE OR REPLACE FUNCTION set_repair_progress_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        NEW.progress = get_repair_progress(NEW.status);
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Zastosuj trigger na tabela repairs
DROP TRIGGER IF EXISTS set_repair_progress_trigger ON repairs;
CREATE TRIGGER set_repair_progress_trigger 
    BEFORE UPDATE ON repairs 
    FOR EACH ROW 
    EXECUTE FUNCTION set_repair_progress_on_status_change();

-- =====================================================
-- 7. DANE TESTOWE
-- =====================================================

-- Przykładowe naprawy z nowymi statusami (opcjonalnie)
INSERT INTO repairs (
    repair_id, customer_name, customer_email, customer_phone,
    device_type, device_model, device_description, issue_description,
    status, progress, estimated_completion, estimated_price
) VALUES 
(
    'BC-TEST-001', 
    'Jan Kowalski', 
    'jan@example.com', 
    '+48 123 456 789',
    'laptop', 
    'MacBook Pro 2020', 
    'MacBook Pro 13"', 
    'Problem z ładowaniem',
    'new_request',
    10,
    NOW() + INTERVAL '3 days',
    299.00
),
(
    'BC-TEST-002',
    'Anna Nowak',
    'anna@example.com',
    '+48 987 654 321',
    'desktop',
    'Dell OptiPlex',
    'Desktop PC',
    'Przegrzewanie się',
    'in_repair',
    70,
    NOW() + INTERVAL '1 day',
    179.00
),
(
    'BC-TEST-003',
    'Piotr Wiśniewski',
    'piotr@example.com',
    '+48 555 666 777',
    'smartphone',
    'iPhone 13 Pro',
    'iPhone 13 Pro',
    'Wymiana ekranu',
    'ready_for_pickup',
    100,
    NOW(),
    449.00
)
ON CONFLICT (repair_id) DO NOTHING;

-- =====================================================
-- 8. WERYFIKACJA
-- =====================================================

-- Sprawdź czy wszystkie statusy zostały zaktualizowane
SELECT 
    status,
    get_repair_status_label(status) as label,
    get_repair_progress(status) as progress,
    COUNT(*) as count
FROM repairs 
GROUP BY status
ORDER BY get_repair_progress(status);

-- Sprawdź funkcje
SELECT get_repair_status_label('new_request') as test_label;
SELECT get_repair_progress('in_repair') as test_progress;

-- =====================================================
-- KOMENTARZE DO DOKUMENTACJI
-- =====================================================

COMMENT ON FUNCTION get_repair_status_label(TEXT) IS 'Funkcja zwraca polską etykietę dla statusu naprawy';
COMMENT ON FUNCTION get_repair_progress(TEXT) IS 'Funkcja oblicza procent postępu na podstawie statusu';
COMMENT ON FUNCTION update_repair_status(UUID, TEXT, TEXT) IS 'Funkcja aktualizuje status naprawy z logowaniem w osi czasu';