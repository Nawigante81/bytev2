-- =====================================================
-- ByteClinic - System Rezerwacji i Śledzenia Napraw
-- Data: 2025-12-01
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
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =====================================================
-- 2. TABELA: bookings (rezerwacje)
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id VARCHAR(20) UNIQUE NOT NULL DEFAULT 'BC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
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

-- Indeksy dla wydajności (tworzone tylko jeśli kolumny istnieją)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'customer_email'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booking_date'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booking_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
    END IF;
END $$;

-- =====================================================
-- 3. TABELA: repairs (śledzenie napraw)
-- =====================================================
CREATE TABLE IF NOT EXISTS repairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id VARCHAR(20) UNIQUE NOT NULL DEFAULT 'BC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    
    -- Szczegóły urządzenia
    device_type VARCHAR(50) NOT NULL,
    device_model VARCHAR(255),
    device_serial VARCHAR(255),
    device_description TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    
    -- Status i postęp
    status VARCHAR(30) NOT NULL DEFAULT 'received',
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
    CONSTRAINT chk_status_repair CHECK (status IN ('received', 'diagnosed', 'in_progress', 'testing', 'completed', 'ready', 'delivered', 'cancelled')),
    CONSTRAINT chk_price_positive CHECK (estimated_price >= 0 AND (final_price IS NULL OR final_price >= 0)),
    CONSTRAINT chk_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'customer_email'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repairs_customer_email ON repairs(customer_email);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repairs_created_at ON repairs(created_at);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repair_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repairs_repair_id ON repairs(repair_id);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'technician_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repairs_technician ON repairs(technician_id);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'priority'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repairs_priority ON repairs(priority);
    END IF;
END $$;

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
    CONSTRAINT chk_timeline_status CHECK (status IN ('received', 'diagnosed', 'in_progress', 'testing', 'completed', 'ready', 'delivered', 'cancelled'))
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repair_timeline' AND column_name = 'repair_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repair_timeline_repair_id ON repair_timeline(repair_id);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'repair_timeline' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_repair_timeline_created_at ON repair_timeline(created_at);
    END IF;
END $$;

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

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'email_notifications' AND column_name = 'recipient_email'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient_email);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'email_notifications' AND column_name = 'type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(type);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'email_notifications' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'email_notifications' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);
    END IF;
END $$;

-- =====================================================
-- 6. TABELA: service_catalog (katalog usług)
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
-- FUNKCJE POMOCNICZE
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

-- Funkcja do automatycznego aktualizowania updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at'
    ) THEN
        CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at'
    ) THEN
        CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_repairs_updated_at'
    ) THEN
        CREATE TRIGGER update_repairs_updated_at BEFORE UPDATE ON repairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_service_catalog_updated_at'
    ) THEN
        CREATE TRIGGER update_service_catalog_updated_at BEFORE UPDATE ON service_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- POLITYKI RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Włącz RLS na wszystkich tabelach
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Users can view own customer data'
    ) THEN
        CREATE POLICY "Users can view own customer data" ON customers
                FOR SELECT USING (auth.uid() = id OR email = auth.jwt() ->> 'email');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Users can update own customer data'
    ) THEN
        CREATE POLICY "Users can update own customer data" ON customers
                FOR UPDATE USING (auth.uid() = id OR email = auth.jwt() ->> 'email');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Users can view own bookings'
    ) THEN
        CREATE POLICY "Users can view own bookings" ON bookings
                FOR SELECT USING (customer_email = auth.jwt() ->> 'email' OR auth.uid() = customer_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Users can insert own bookings'
    ) THEN
        CREATE POLICY "Users can insert own bookings" ON bookings
                FOR INSERT WITH CHECK (customer_email = auth.jwt() ->> 'email' OR auth.uid() = customer_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'repairs' AND policyname = 'Users can view own repairs'
    ) THEN
        CREATE POLICY "Users can view own repairs" ON repairs
                FOR SELECT USING (customer_email = auth.jwt() ->> 'email' OR auth.uid() = customer_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_catalog' AND policyname = 'Everyone can view service catalog'
    ) THEN
        CREATE POLICY "Everyone can view service catalog" ON service_catalog
                FOR SELECT TO authenticated USING (is_active = true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_notifications' AND policyname = 'Only service role can manage email notifications'
    ) THEN
        CREATE POLICY "Only service role can manage email notifications" ON email_notifications
                FOR ALL TO service_role USING (true);
    END IF;
END $$;

-- =====================================================
-- FUNKCJE DLA APLIKACJI
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
    WHERE b.customer_email = customer_email_param
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do pobierania napraw klienta
CREATE OR REPLACE FUNCTION get_customer_repairs(customer_email_param TEXT)
RETURNS TABLE (
    repair_id TEXT,
    device_model TEXT,
    issue_description TEXT,
    status TEXT,
    progress INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.repair_id, r.device_model, r.issue_description, 
           r.status::TEXT, r.progress, r.created_at, r.estimated_completion
    FROM repairs r
    WHERE r.customer_email = customer_email_param
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- KOMENTARZE I DOKUMENTACJA
-- =====================================================

COMMENT ON TABLE customers IS 'Tabela klientów - przechowuje podstawowe dane kontaktowe';
COMMENT ON TABLE bookings IS 'Tabela rezerwacji wizyt w serwisie';
COMMENT ON TABLE repairs IS 'Tabela śledzenia napraw urządzeń';
COMMENT ON TABLE repair_timeline IS 'Oś czasu zmian statusu napraw';
COMMENT ON TABLE email_notifications IS 'Logi wszystkich wysłanych powiadomień email';
COMMENT ON TABLE service_catalog IS 'Katalog dostępnych usług serwisowych';

-- =====================================================
-- WERYFIKACJA SCHEMATU
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
    AND tablename IN ('customers', 'bookings', 'repairs', 'repair_timeline', 'email_notifications', 'service_catalog')
ORDER BY tablename;