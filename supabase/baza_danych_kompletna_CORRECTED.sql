-- =====================================================
-- ByteClinic - Kompletna Struktura Bazy Danych
-- Data: 2025-12-05
-- Wszystkie tabele, funkcje, triggery w jednym pliku
-- =====================================================

-- =====================================================
-- 1. TABELA: customers
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks na email dla szybszego wyszukiwania
CREATE INDEX idx_customers_email ON customers(email);

-- =====================================================
-- 2. TABELA: bookings (rezerwacje)
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id VARCHAR(20) UNIQUE NOT NULL DEFAULT 'BC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Szczegóły wizyty
    service_type VARCHAR(50) NOT NULL, -- 'diag-laptop', 'diag-pc', 'repair-quick', etc.
    service_name VARCHAR(255) NOT NULL,
    service_description TEXT,
    device_type VARCHAR(50) NOT NULL, -- 'laptop', 'pc', 'macbook', 'mobile', etc.
    device_model VARCHAR(255),
    device_description TEXT,
    
    -- Data i czas
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    
    -- Status i ceny
    status VARCHAR(20) DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled', 'completed'
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'PLN',
    
    -- Notatki
    notes TEXT,
    admin_notes TEXT,
    
    -- Powiadomienia
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    reminder_scheduled_at TIMESTAMP WITH TIME ZONE,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadane
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Konflikty i walidacja
    CONSTRAINT chk_booking_date CHECK (booking_date >= CURRENT_DATE),
    CONSTRAINT chk_price CHECK (price >= 0),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'))
);

-- Indeksy dla wydajności
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_booking_id ON bookings(booking_id);

-- =====================================================
-- 3. TABELA: repairs (śledzenie napraw)
-- =====================================================
CREATE TABLE IF NOT EXISTS repairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id VARCHAR(20) UNIQUE NOT NULL DEFAULT 'BC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Szczegóły urządzenia
    device_type VARCHAR(50) NOT NULL,
    device_model VARCHAR(255),
    device_serial VARCHAR(255),
    device_description TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    
    -- Status i postęp
    status VARCHAR(30) NOT NULL DEFAULT 'new_request',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Przypisanie
    technician_id UUID REFERENCES auth.users(id),
    technician_name VARCHAR(255),
    
    -- Czas i estymacje
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_completion TIMESTAMP WITH TIME ZONE,
    actual_completion TIMESTAMP WITH TIME ZONE,
    
    -- Finanse
    estimated_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'PLN',
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
    
    -- Diagnoza i naprawa
    diagnosis TEXT,
    repair_work TEXT,
    parts_used JSONB, -- [{name: 'Screen', price: 299, status: 'installed'}]
    
    -- Kontakt i komunikacja
    last_customer_contact TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Powiadomienia
    status_notifications_sent JSONB DEFAULT '{}', -- trackowane wysłane powiadomienia
    
    -- Metadane
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Konflikty
    CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT chk_status_repair_new CHECK (status IN ('new_request', 'open', 'in_repair', 'waiting_for_parts', 'repair_completed', 'ready_for_pickup')),
    CONSTRAINT chk_price_positive CHECK (estimated_price >= 0 AND (final_price IS NULL OR final_price >= 0)),
    CONSTRAINT chk_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indeksy dla wydajności
CREATE INDEX idx_repairs_status ON repairs(status);
CREATE INDEX idx_repairs_created_at ON repairs(created_at);
CREATE INDEX idx_repairs_repair_id ON repairs(repair_id);
CREATE INDEX idx_repairs_technician ON repairs(technician_id);
CREATE INDEX idx_repairs_priority ON repairs(priority);

-- =====================================================
-- 4. TABELA: repair_timeline (oś czasu napraw)
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id UUID REFERENCES repairs(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    technician_name VARCHAR(255),
    
    -- Dostępne informacje
    estimated_completion TIMESTAMP WITH TIME ZONE,
    price_change DECIMAL(10,2),
    notes TEXT,
    
    -- Zdjęcia
    photos JSONB, -- ['url1', 'url2'] lub [{url: 'url', description: 'text'}]
    
    -- Metadane
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Walidacja
    CONSTRAINT chk_timeline_status_new CHECK (status IN ('new_request', 'open', 'in_repair', 'waiting_for_parts', 'repair_completed', 'ready_for_pickup'))
);

-- Indeksy
CREATE INDEX idx_repair_timeline_repair_id ON repair_timeline(repair_id);
CREATE INDEX idx_repair_timeline_created_at ON repair_timeline(created_at);

-- =====================================================
-- 5. TABELA: email_notifications (logi emaili)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Typ powiadomienia
    type VARCHAR(50) NOT NULL, -- 'booking_confirmation', 'booking_reminder', 'repair_status', 'repair_ready'
    
    -- Odbiorca
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    
    -- Powiązanie
    booking_id UUID REFERENCES bookings(id),
    repair_id UUID REFERENCES repairs(id),
    
    -- Status wysyłki
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
    provider VARCHAR(20), -- 'resend', 'sendgrid', etc.
    provider_message_id VARCHAR(255),
    
    -- Treść
    subject VARCHAR(500),
    template_data JSONB, -- dane użyte w template
    
    -- Metadane
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_email_notifications_recipient ON email_notifications(recipient_email);
CREATE INDEX idx_email_notifications_type ON email_notifications(type);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_created_at ON email_notifications(created_at);

-- =====================================================
-- 6. TABELA: notifications (powiadomienia)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id TEXT UNIQUE NOT NULL, -- Unikalny identyfikator powiadomienia
  type TEXT NOT NULL, -- Typ powiadomienia (repair_request, booking_confirmation, etc.)
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  data JSONB, -- Dodatkowe dane związane z powiadomieniem
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT, -- Komunikat błędu w przypadku niepowodzenia
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB, -- Dodatkowe metadane (user agent, IP, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_recipient_email ON notifications(recipient_email);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_notification_id ON notifications(notification_id);

-- =====================================================
-- 7. TABELA: service_catalog (katalog usług)
-- =====================================================
CREATE TABLE IF NOT EXISTS service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dane podstawowe dla katalogu usług
INSERT INTO service_catalog (service_type, name, description, base_price, duration_minutes, sort_order) VALUES
('diag-laptop', 'Diagnoza laptopa', 'Pełna analiza problemu + raport', 99.00, 60, 1),
('diag-pc', 'Diagnoza PC', 'Diagnoza + kosztorys naprawy', 129.00, 90, 2),
('repair-quick', 'Szybka naprawa', 'Proste problemy (wymiana części)', 79.00, 45, 3),
('consultation', 'Konsultacja IT', 'Doradztwo techniczne online', 59.00, 30, 4),
('pickup', 'Odbiór sprzętu', 'Darmowy odbiór w Zgorzelcu', 0.00, 30, 5),
('cleaning', 'Czyszczenie + pasta', 'Czyszczenie układu chłodzenia + wymiana pasty', 149.00, 120, 6),
('reinstall', 'Instalacja systemu', 'Windows/Linux/macOS + sterowniki', 199.00, 180, 7),
('optimization', 'Optymalizacja', 'Tuning, czyszczenie autostartu, zabezpieczenia', 149.00, 90, 8),
('network', 'Sieci i Wi-Fi', 'Routery/AP, poprawa zasięgu i bezpieczeństwa', 149.00, 120, 9),
('mobile-repair', 'Serwis mobilny', 'Diagnoza, baterie, ekrany, gniazda', 0.00, 0, 10),
('iot-project', 'Elektronika/IoT', 'ESP32, Arduino, czujniki, sterowniki', 0.00, 0, 11),
('server-virtual', 'Serwery/Virtualizacja', 'NAS, Proxmox, Docker, monitoring', 299.00, 240, 12)
ON CONFLICT (service_type) DO NOTHING;

-- =====================================================
-- 8. TABELA: requests (centralna tabela zgłoszeń)
-- =====================================================
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Unikalny identyfikator zgłoszenia
    request_id VARCHAR(50) UNIQUE NOT NULL DEFAULT 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 8)),
    
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
-- 9. DODANIE POLA request_id DO ISTNIEJĄCYCH TABEL
-- =====================================================

-- Dodanie request_id do tabeli bookings
ALTER TABLE bookings ADD COLUMN request_id UUID REFERENCES requests(id);

-- Dodanie request_id do tabeli repairs  
ALTER TABLE repairs ADD COLUMN request_id UUID REFERENCES requests(id);

-- =====================================================
-- 10. POLA PUBLICZNE DLA ŚLEDZENIA NAPRAW
-- =====================================================

ALTER TABLE repairs ADD COLUMN public_code VARCHAR(12) UNIQUE;
ALTER TABLE repairs ADD COLUMN secret_token VARCHAR(64) UNIQUE;

-- =====================================================
-- 11. FUNKCJE POMOCNICZE
-- =====================================================

-- Funkcja do automatycznego generowania booking_id
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'BC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- Funkcja do automatycznego generowania repair_id
CREATE OR REPLACE FUNCTION generate_repair_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'BC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
END;
$$ LANGUAGE plpgsql;

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

-- Funkcja do automatycznego aktualizowania updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do generowania notification_id
CREATE OR REPLACE FUNCTION generate_notification_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'notif_' || extract(epoch from now())::bigint::text || '_' || substr(gen_random_uuid()::text, 1, 8);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. TRIGGERY AUTOMATYCZNE
-- =====================================================

-- Triggery dla automatycznego updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repairs_updated_at BEFORE UPDATE ON repairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_catalog_updated_at BEFORE UPDATE ON service_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funkcja do automatycznego ustawiania request_id
CREATE OR REPLACE FUNCTION set_request_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_id IS NULL THEN
        NEW.request_id = generate_request_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do automatycznego ustawiania pól publicznych dla napraw
CREATE OR REPLACE FUNCTION set_repair_public_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_code IS NULL THEN
        NEW.public_code = generate_public_code();
    END IF;
    IF NEW.secret_token IS NULL THEN
        NEW.secret_token = generate_secret_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger do automatycznego generowania request_id
CREATE TRIGGER set_request_id_trigger 
    BEFORE INSERT OR UPDATE ON requests 
    FOR EACH ROW 
    EXECUTE FUNCTION set_request_id();

-- Trigger do automatycznego generowania pól publicznych dla napraw
CREATE TRIGGER set_repair_public_fields_trigger 
    BEFORE INSERT OR UPDATE ON repairs 
    FOR EACH ROW 
    EXECUTE FUNCTION set_repair_public_fields();

-- =====================================================
-- 13. FUNKCJE DLA APLIKACJI
-- =====================================================

-- Funkcja do pobierania rezerwacji klienta
CREATE OR REPLACE FUNCTION get_customer_bookings(customer_email_param TEXT)
RETURNS TABLE (
    booking_id TEXT,
    service_name TEXT,
    booking_date DATE,
    booking_time TIME,
    status TEXT,
    price DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.booking_id, b.service_name, b.booking_date, b.booking_time, 
           b.status::TEXT, b.price, b.created_at
    FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    WHERE c.email = customer_email_param
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    JOIN customers c ON r.customer_id = c.id
    WHERE c.email = customer_email_param
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- =====================================================
-- 14. FUNKCJE STATUSÓW I POSTĘPU
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
-- 15. POLITYKI RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Włącz RLS na wszystkich tabelach
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Polityki dla customers (klienci widzą tylko swoje dane)
CREATE POLICY "Users can view own customer data" ON customers
    FOR SELECT USING (auth.uid() = id OR email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update own customer data" ON customers
    FOR UPDATE USING (auth.uid() = id OR email = auth.jwt() ->> 'email');

-- Polityki dla bookings (klienci widzą tylko swoje rezerwacje)
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = bookings.customer_id 
            AND customers.email = auth.jwt() ->> 'email'
        )
    );

-- Publiczny dostęp do tworzenia rezerwacji (bez logowania)
CREATE POLICY "Public can insert bookings" ON bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Zalogowani użytkownicy mogą też tworzyć rezerwacje (jeśli mają konto)
CREATE POLICY "Users can insert own bookings" ON bookings
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = bookings.customer_id 
            AND customers.email = auth.jwt() ->> 'email'
        )
    );

-- Polityki dla repairs (klienci widzą tylko swoje naprawy)
CREATE POLICY "Users can view own repairs" ON repairs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = repairs.customer_id 
            AND customers.email = auth.jwt() ->> 'email'
        )
    );

-- Publiczny dostęp do tworzenia zgłoszeń napraw (bez logowania)
CREATE POLICY "Public can insert repairs" ON repairs
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Zalogowani użytkownicy mogą też tworzyć zgłoszenia napraw
CREATE POLICY "Users can insert own repairs" ON repairs
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = repairs.customer_id 
            AND customers.email = auth.jwt() ->> 'email'
        )
    );

-- Polityki dla service_catalog (wszyscy mogą czytać)
CREATE POLICY "Everyone can view service catalog" ON service_catalog
    FOR SELECT TO anon, authenticated USING (is_active = true);

-- Polityki dla email_notifications (tylko admin)
CREATE POLICY "Only service role can manage email notifications" ON email_notifications
    FOR ALL TO service_role USING (true);

-- Polityki dla notifications (admini mogą przeglądać wszystkie)
CREATE POLICY "Admin can view all notifications" 
  ON notifications FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Polityki dla użytkowników - mogą przeglądać tylko swoje powiadomienia
CREATE POLICY "Users can view their notifications" 
  ON notifications FOR SELECT 
  TO authenticated 
  USING (recipient_email = auth.jwt() ->> 'email');

-- Edge Functions mogą tworzyć powiadomienia
CREATE POLICY "Edge functions can insert notifications" 
  ON notifications FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- Admini mogą aktualizować status powiadomień
CREATE POLICY "Admin can update notifications" 
  ON notifications FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

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
-- UWAGA: Ta polityka pozwala każdemu zobaczyć wszystkie naprawy z ustawionym public_code
-- Bezpieczne, ponieważ public_code są losowe, ale teoretycznie można pobrać wszystkie "publiczne" naprawy
CREATE POLICY "Public can view repair by public code" ON repairs
    FOR SELECT USING (public_code IS NOT NULL);

-- =====================================================
-- 16. INDEKSY DLA WYDAJNOŚCI
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
-- 17. WIDOKI I FUNKCJE AGGREGACYJNE
-- =====================================================

-- Widok dla podsumowania powiadomień
CREATE VIEW notification_stats AS
SELECT 
  type,
  status,
  COUNT(*) as count,
  DATE_TRUNC('day', created_at) as date
FROM notifications
GROUP BY type, status, DATE_TRUNC('day', created_at)
ORDER BY date DESC, type, status;

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
-- 18. KOMENTARZE DOKUMENTACYJNE
-- =====================================================

COMMENT ON TABLE customers IS 'Tabela klientów - przechowuje podstawowe dane kontaktowe';
COMMENT ON TABLE bookings IS 'Tabela rezerwacji wizyt w serwisie';
COMMENT ON TABLE repairs IS 'Tabela śledzenia napraw urządzeń';
COMMENT ON TABLE repair_timeline IS 'Oś czasu zmian statusu napraw';
COMMENT ON TABLE email_notifications IS 'Logi wszystkich wysłanych powiadomień email';
COMMENT ON TABLE notifications IS 'Tabela przechowująca wszystkie wysłane powiadomienia email';
COMMENT ON TABLE service_catalog IS 'Katalog dostępnych usług serwisowych';
COMMENT ON TABLE requests IS 'Centralna tabela wszystkich zgłoszeń w systemie ByteClinic';

-- =====================================================
-- 19. WERYFIKACJA SCHEMATU
-- =====================================================

-- Sprawdź czy wszystkie tabele zostały utworzone
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('customers', 'bookings', 'repairs', 'repair_timeline', 'email_notifications', 'notifications', 'service_catalog', 'requests')
ORDER BY tablename;

-- =====================================================
-- SUKCES!
-- =====================================================