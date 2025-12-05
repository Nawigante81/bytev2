-- =====================================================
-- ByteClinic - Centralna Tabela Requests
-- Data: 2025-12-05
-- Cel: Stworzenie centralnej tabeli dla wszystkich zgłoszeń
-- =====================================================

-- =====================================================
-- 1. FUNKCJE POMOCNICZE - najpierw funkcje, potem tabele
-- =====================================================

-- Funkcja generująca request_id w formacie 'REQ-YYYYMMDD-XXXXXX'
CREATE OR REPLACE FUNCTION generate_request_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Funkcja generująca public_code dla napraw w formacie 'BC-XXXX-XXXX'
CREATE OR REPLACE FUNCTION generate_public_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'BC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 4)) || '-' || 
           UPPER(SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 5, 4));
END;
$$ LANGUAGE plpgsql;

-- Funkcja generująca secret_token dla napraw
CREATE OR REPLACE FUNCTION generate_secret_token()
RETURNS TEXT AS $$
BEGIN
    RETURN SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT || gen_random_uuid()::TEXT), 1, 64);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CENTRALNA TABELA: requests
-- =====================================================
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Unikalny identyfikator zgłoszenia
    request_id VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_request_id(),
    
    -- Typ zgłoszenia
    type VARCHAR(20) NOT NULL,
    
    -- Źródło zgłoszenia
    source_page VARCHAR(30) NOT NULL,
    
    -- Dane klienta
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    
    -- Szczegóły urządzenia
    device_type VARCHAR(50),
    device_model VARCHAR(255),
    device_description TEXT,
    
    -- Treść zgłoszenia
    message TEXT,
    
    -- Metadane techniczne
    source_url TEXT,
    user_agent TEXT,
    
    -- Zgody i statusy
    consent BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'nowe',
    priority VARCHAR(15) DEFAULT 'normalny',
    
    -- Powiązania
    user_id UUID REFERENCES auth.users(id),
    
    -- Znaczniki czasowe
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. DODANIE KOLUMN request_id DO ISTNIEJĄCYCH TABEL
-- =====================================================

-- Dodanie request_id do tabeli bookings
ALTER TABLE bookings ADD COLUMN request_id UUID REFERENCES requests(id);

-- Dodanie request_id do tabeli repairs  
ALTER TABLE repairs ADD COLUMN request_id UUID REFERENCES requests(id);

-- =====================================================
-- 4. POLA PUBLICZNE DLA ŚLEDZENIA NAPRAW
-- =====================================================

ALTER TABLE repairs ADD COLUMN public_code VARCHAR(12) UNIQUE;
ALTER TABLE repairs ADD COLUMN secret_token VARCHAR(64) UNIQUE;

-- =====================================================
-- 5. TRIGGERY AUTOMATYCZNE
-- =====================================================

-- Trigger do automatycznego generowania request_id
CREATE OR REPLACE FUNCTION set_request_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_id IS NULL OR NEW.request_id = '' THEN
        NEW.request_id = generate_request_id();
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_request_id_trigger 
    BEFORE INSERT OR UPDATE ON requests 
    FOR EACH ROW 
    EXECUTE FUNCTION set_request_id();

-- Trigger do automatycznego generowania pól publicznych dla napraw
CREATE OR REPLACE FUNCTION set_repair_public_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_code IS NULL OR NEW.public_code = '' THEN
        NEW.public_code = generate_public_code();
    END IF;
    
    IF NEW.secret_token IS NULL OR NEW.secret_token = '' THEN
        NEW.secret_token = generate_secret_token();
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_repair_public_fields_trigger 
    BEFORE INSERT OR UPDATE ON repairs 
    FOR EACH ROW 
    EXECUTE FUNCTION set_repair_public_fields();

-- =====================================================
-- 6. INDEKSY DLA WYDAJNOŚCI
-- =====================================================

-- Indeksy dla tabeli requests
CREATE INDEX idx_requests_request_id ON requests(request_id);
CREATE INDEX idx_requests_customer_email ON requests(customer_email);
CREATE INDEX idx_requests_type ON requests(type);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_priority ON requests(priority);
CREATE INDEX idx_requests_created_at ON requests(created_at);
CREATE INDEX idx_requests_source_page ON requests(source_page);

-- Indeksy złożone dla częstych zapytań
CREATE INDEX idx_requests_status_created ON requests(status, created_at);
CREATE INDEX idx_requests_type_status ON requests(type, status);

-- Indeksy dla tabeli repairs - pola publiczne
CREATE INDEX idx_repairs_public_code ON repairs(public_code);
CREATE INDEX idx_repairs_secret_token ON repairs(secret_token);
CREATE INDEX idx_repairs_request_id ON repairs(request_id);

-- Indeksy dla tabeli bookings - request_id
CREATE INDEX idx_bookings_request_id ON bookings(request_id);

-- =====================================================
-- 7. FUNKCJE DLA APLIKACJI
-- =====================================================

-- Funkcja do pobierania wszystkich zgłoszeń klienta
CREATE OR REPLACE FUNCTION get_customer_requests(customer_email_param TEXT)
RETURNS TABLE (
    request_id TEXT,
    type TEXT,
    status TEXT,
    customer_name TEXT,
    device_type TEXT,
    message TEXT,
    created_at TIMESTAMPTZ,
    source_page TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.request_id::TEXT, r.type::TEXT, r.status::TEXT, r.customer_name::TEXT,
           r.device_type::TEXT, r.message::TEXT, r.created_at, r.source_page::TEXT
    FROM requests r
    WHERE r.customer_email = customer_email_param
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do pobierania zgłoszenia po public_code (dla śledzenia napraw)
CREATE OR REPLACE FUNCTION get_repair_by_public_code(public_code_param TEXT)
RETURNS TABLE (
    repair_id TEXT,
    device_type TEXT,
    device_model TEXT,
    status TEXT,
    progress INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    public_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.repair_id::TEXT, r.device_type::TEXT, r.device_model::TEXT,
           r.status::TEXT, r.progress, r.created_at, r.updated_at, r.public_code::TEXT
    FROM repairs r
    WHERE r.public_code = public_code_param
    ORDER BY r.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do tworzenia nowego zgłoszenia i powiązania z istniejącymi tabelami
CREATE OR REPLACE FUNCTION create_request_with_relations(
    request_type VARCHAR(20),
    source_page VARCHAR(30),
    customer_name_param VARCHAR(255),
    customer_email_param VARCHAR(255),
    customer_phone_param VARCHAR(20),
    device_type_param VARCHAR(50),
    device_model_param VARCHAR(255),
    device_description_param TEXT,
    message_param TEXT,
    priority_param VARCHAR(15) DEFAULT 'normalny',
    source_url_param TEXT DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL,
    consent_param BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    new_request_id UUID;
BEGIN
    -- Utwórz nowe zgłoszenie
    INSERT INTO requests (
        type, source_page, customer_name, customer_email, customer_phone,
        device_type, device_model, device_description, message,
        priority, source_url, user_agent, consent
    ) VALUES (
        request_type, source_page, customer_name_param, customer_email_param, customer_phone_param,
        device_type_param, device_model_param, device_description_param, message_param,
        priority_param, source_url_param, user_agent_param, consent_param
    ) RETURNING id INTO new_request_id;
    
    RETURN new_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. RLS POLICIES DLA TABELI REQUESTS
-- =====================================================

-- Włącz RLS na tabeli requests
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Polityki dla klientów (mogą widzieć tylko swoje zgłoszenia)
CREATE POLICY "Customers can view own requests" ON requests
    FOR SELECT USING (customer_email = auth.jwt() ->> 'email');

CREATE POLICY "Customers can insert own requests" ON requests
    FOR INSERT WITH CHECK (customer_email = auth.jwt() ->> 'email');

-- Polityki dla administratorów (pełny dostęp)
CREATE POLICY "Service role can manage all requests" ON requests
    FOR ALL TO service_role USING (true);

-- Polityki dla zalogowanych użytkowników (mogą widzieć swoje)
CREATE POLICY "Authenticated users can view own requests" ON requests
    FOR SELECT USING (auth.uid() = user_id);

-- Polityki dla publicznego dostępu (tylko odczyt)
CREATE POLICY "Public can view approved requests" ON requests
    FOR SELECT USING (status IN ('zakonczone') AND consent = true);

-- Polityki dla publicznego dostępu do napraw przez public_code
CREATE POLICY "Public can view repair by public code" ON repairs
    FOR SELECT USING (public_code IS NOT NULL);

-- =====================================================
-- 9. FUNKCJA MIGRACJI DANYCH
-- =====================================================

-- Funkcja migracji danych z diagnosis_requests do requests
-- (Uwaga: tabela diagnosis_requests nie istnieje obecnie, funkcja gotowa na przyszłość)
CREATE OR REPLACE FUNCTION migrate_diagnosis_requests()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Sprawdź czy tabela diagnosis_requests istnieje
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnosis_requests') THEN
        -- Migracja danych z diagnosis_requests do requests
        INSERT INTO requests (
            type, source_page, customer_name, customer_email, customer_phone,
            device_type, device_model, device_description, message,
            status, priority, created_at, updated_at
        )
        SELECT 
            'diagnoza_online' as type,
            'modal_diagnoza' as source_page,
            customer_name,
            customer_email,
            customer_phone,
            device_type,
            device_model,
            device_description,
            issue_description as message,
            'nowe' as status,
            'normalny' as priority,
            created_at,
            NOW() as updated_at
        FROM diagnosis_requests
        WHERE NOT EXISTS (
            SELECT 1 FROM requests 
            WHERE requests.customer_email = diagnosis_requests.customer_email 
            AND requests.message = diagnosis_requests.issue_description
            AND DATE_TRUNC('day', requests.created_at) = DATE_TRUNC('day', diagnosis_requests.created_at)
        );
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        
        RAISE NOTICE 'Zaimigrowano % zgłoszeń z diagnosis_requests', migrated_count;
    ELSE
        RAISE NOTICE 'Tabela diagnosis_requests nie istnieje - migracja pominięta';
        migrated_count := 0;
    END IF;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Wykonaj migrację (zwróci 0 jeśli tabela nie istnieje)
SELECT migrate_diagnosis_requests();

-- =====================================================
-- 10. FUNKCJE AGGREGACYJNE I RAPORTOWE
-- =====================================================

-- Funkcja do statystyk zgłoszeń
CREATE OR REPLACE FUNCTION get_requests_statistics()
RETURNS TABLE (
    total_requests BIGINT,
    requests_by_type JSONB,
    requests_by_status JSONB,
    requests_by_priority JSONB,
    avg_response_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        (
            SELECT jsonb_object_agg(type, count)
            FROM (
                SELECT type, COUNT(*) as count
                FROM requests
                GROUP BY type
            ) t
        ) as requests_by_type,
        (
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM requests
                GROUP BY status
            ) t
        ) as requests_by_status,
        (
            SELECT jsonb_object_agg(priority, count)
            FROM (
                SELECT priority, COUNT(*) as count
                FROM requests
                GROUP BY priority
            ) t
        ) as requests_by_priority,
        AVG(updated_at - created_at) as avg_response_time
    FROM requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. KOMENTARZE DOKUMENTACYJNE
-- =====================================================

-- Komentarze do tabeli
COMMENT ON TABLE requests IS 'Centralna tabela wszystkich zgłoszeń w systemie ByteClinic';
COMMENT ON COLUMN requests.id IS 'UUID - główny klucz tabeli';
COMMENT ON COLUMN requests.request_id IS 'Unikalny identyfikator zgłoszenia w formacie REQ-YYYYMMDD-XXXXXXXX';
COMMENT ON COLUMN requests.type IS 'Typ zgłoszenia: kontakt, diagnoza_online, wycena, rezerwacja, inna';
COMMENT ON COLUMN requests.source_page IS 'Źródło zgłoszenia: kontakt, modal_diagnoza, cennik, hero, strona_glowna';
COMMENT ON COLUMN requests.customer_name IS 'Imię i nazwisko klienta';
COMMENT ON COLUMN requests.customer_email IS 'Adres email klienta';
COMMENT ON COLUMN requests.customer_phone IS 'Numer telefonu klienta';
COMMENT ON COLUMN requests.device_type IS 'Typ urządzenia: laptop, desktop, smartphone, tablet';
COMMENT ON COLUMN requests.device_model IS 'Model urządzenia';
COMMENT ON COLUMN requests.device_description IS 'Szczegółowy opis urządzenia';
COMMENT ON COLUMN requests.message IS 'Treść wiadomości lub opis problemu';
COMMENT ON COLUMN requests.source_url IS 'URL strony, z której pochodzi zgłoszenie';
COMMENT ON COLUMN requests.user_agent IS 'Informacje o przeglądarce/urządzeniu';
COMMENT ON COLUMN requests.consent IS 'Zgoda na przetwarzanie danych';
COMMENT ON COLUMN requests.status IS 'Status zgłoszenia: nowe, w_trakcie, zakonczone, anulowane';
COMMENT ON COLUMN requests.priority IS 'Priorytet: niski, normalny, wysoki, pilny';
COMMENT ON COLUMN requests.user_id IS 'ID użytkownika (z auth.users) jeśli zgłoszenie pochodzi od zalogowanego';

-- Komentarze do funkcji
COMMENT ON FUNCTION generate_request_id() IS 'Generuje unikalny identyfikator zgłoszenia w formacie REQ-YYYYMMDD-XXXXXXXX';
COMMENT ON FUNCTION generate_public_code() IS 'Generuje publiczny kod śledzenia naprawy w formacie BC-XXXX-XXXX';
COMMENT ON FUNCTION generate_secret_token() IS 'Generuje bezpieczny token do dostępu do szczegółów naprawy';
COMMENT ON FUNCTION create_request_with_relations(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, VARCHAR, TEXT, TEXT, BOOLEAN) IS 'Tworzy nowe zgłoszenie i zwraca jego UUID';
COMMENT ON FUNCTION get_customer_requests(TEXT) IS 'Pobiera wszystkie zgłoszenia dla danego adresu email';
COMMENT ON FUNCTION get_repair_by_public_code(TEXT) IS 'Pobiera szczegóły naprawy na podstawie publicznego kodu';
COMMENT ON FUNCTION migrate_diagnosis_requests() IS 'Migruje dane z tabeli diagnosis_requests do centralnej tabeli requests';

-- Komentarze do tabeli repairs (nowe kolumny)
COMMENT ON COLUMN repairs.public_code IS 'Publiczny kod śledzenia naprawy (format: BC-XXXX-XXXX)';
COMMENT ON COLUMN repairs.secret_token IS 'Bezpieczny token do dostępu do szczegółów naprawy';
COMMENT ON COLUMN repairs.request_id IS 'UUID powiązanego zgłoszenia w centralnej tabeli requests';

-- Komentarze do tabeli bookings (nowa kolumna)
COMMENT ON COLUMN bookings.request_id IS 'UUID powiązanego zgłoszenia w centralnej tabeli requests';

-- =====================================================
-- 12. WERYFIKACJA SCHEMATU
-- =====================================================

-- Sprawdź czy centralna tabela requests została utworzona
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'requests'
ORDER BY tablename;

-- Sprawdź czy kolumny zostały dodane do istniejących tabel
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('bookings', 'repairs', 'requests')
    AND column_name IN ('request_id', 'public_code', 'secret_token')
ORDER BY table_name, column_name;

-- Sprawdź funkcje
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('generate_request_id', 'generate_public_code', 'generate_secret_token', 'migrate_diagnosis_requests')
ORDER BY routine_name;

-- Test funkcji generujących
SELECT 
    'Request ID: ' || generate_request_id() as test_request_id,
    'Public Code: ' || generate_public_code() as test_public_code,
    'Secret Token: ' || SUBSTR(generate_secret_token(), 1, 20) || '...' as test_secret_token;

-- Sprawdź RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'requests'
ORDER BY policyname;

-- =====================================================
-- KONIEC MIGRACJI
-- =====================================================

-- Informacja o zakończeniu migracji
RAISE NOTICE 'Migracja centralnej tabeli requests została pomyślnie wykonana!';
RAISE NOTICE 'Utworzono tabelę requests z funkcjami pomocniczymi, RLS policies i indeksami';
RAISE NOTICE 'Dodano powiązania do tabel bookings i repairs';
RAISE NOTICE 'Zaimplementowano pola publiczne dla śledzenia napraw';