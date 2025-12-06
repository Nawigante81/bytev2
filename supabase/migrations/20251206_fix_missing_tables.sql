-- =====================================================
-- ByteClinic - Naprawa Brakujących Tabel i Widoków
-- Data: 2025-12-06
-- Cel: Naprawienie problemów z nieistniejącymi tabelami
-- =====================================================

-- =====================================================
-- 1. WIDOK: diagnosis_requests -> requests
-- Kod używa "diagnosis_requests", ale tabela nazywa się "requests"
-- =====================================================
CREATE OR REPLACE VIEW diagnosis_requests AS
SELECT 
    id,
    request_id as ticket_id,
    type,
    source_page,
    customer_name as name,
    customer_email as email,
    customer_phone as phone,
    device_type as device,
    device_model,
    device_description,
    message,
    source_url,
    user_agent,
    status,
    priority,
    user_id,
    created_at,
    updated_at
FROM requests;

-- Uprawnienia dla widoku
GRANT SELECT, INSERT, UPDATE, DELETE ON diagnosis_requests TO authenticated, anon;

-- =====================================================
-- 2. TABELA: service_catalog
-- Katalog usług oferowanych przez serwis
-- =====================================================
CREATE TABLE IF NOT EXISTS service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    
    -- Cennik
    price DECIMAL(10,2),
    price_from DECIMAL(10,2),
    price_to DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'PLN',
    
    -- Czas
    duration_minutes INTEGER,
    estimated_days INTEGER,
    
    -- Status
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    
    -- Metadane
    icon VARCHAR(50),
    image_url TEXT,
    tags TEXT[],
    
    -- Timestampy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_service_catalog_active ON service_catalog(active);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON service_catalog(category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_featured ON service_catalog(featured);

-- Trigger dla updated_at
CREATE TRIGGER service_catalog_updated_at
BEFORE UPDATE ON service_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "service_catalog_select_all" ON service_catalog
FOR SELECT USING (true);

CREATE POLICY "service_catalog_insert_admin" ON service_catalog
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "service_catalog_update_admin" ON service_catalog
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "service_catalog_delete_admin" ON service_catalog
FOR DELETE USING (public.is_admin(auth.uid()));

-- Uprawnienia
GRANT SELECT ON service_catalog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON service_catalog TO authenticated;

-- =====================================================
-- 3. TABELA: service_orders
-- Zamówienia usług przez klientów
-- =====================================================
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(20) UNIQUE NOT NULL DEFAULT 'SO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || gen_random_uuid()::TEXT), 1, 6)),
    
    -- Powiązania
    service_id UUID REFERENCES service_catalog(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    
    -- Dane klienta
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    
    -- Szczegóły zamówienia
    service_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'PLN',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    
    -- Daty
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_date DATE,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Notatki
    notes TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_order_status CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'))
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_email ON service_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON service_orders(created_at DESC);

-- Trigger
CREATE TRIGGER service_orders_updated_at
BEFORE UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "service_orders_select_own_or_admin" ON service_orders
FOR SELECT USING (customer_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "service_orders_insert_auth" ON service_orders
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "service_orders_update_admin" ON service_orders
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "service_orders_delete_admin" ON service_orders
FOR DELETE USING (public.is_admin(auth.uid()));

GRANT SELECT, INSERT ON service_orders TO authenticated;
GRANT UPDATE, DELETE ON service_orders TO authenticated;

-- =====================================================
-- 4. TABELA: ticket_comments
-- Komentarze do zgłoszeń
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Powiązania
    ticket_id UUID NOT NULL, -- może wskazywać na requests.id
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Treść
    body TEXT NOT NULL,
    author VARCHAR(255),
    
    -- Flagi
    is_private BOOLEAN DEFAULT false,
    is_internal BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    
    -- Timestampy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_comment_status CHECK (status IN ('active', 'deleted', 'hidden'))
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_user_id ON ticket_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

-- Trigger
CREATE TRIGGER ticket_comments_updated_at
BEFORE UPDATE ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "ticket_comments_select_public_or_admin" ON ticket_comments
FOR SELECT USING (NOT is_private OR user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "ticket_comments_insert_auth" ON ticket_comments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ticket_comments_update_own_or_admin" ON ticket_comments
FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "ticket_comments_delete_admin" ON ticket_comments
FOR DELETE USING (public.is_admin(auth.uid()));

GRANT SELECT, INSERT ON ticket_comments TO authenticated;
GRANT UPDATE, DELETE ON ticket_comments TO authenticated;

-- =====================================================
-- 5. TABELA: ticket_attachments
-- Załączniki do zgłoszeń
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Powiązania
    ticket_id UUID NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Dane pliku
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    
    -- Metadane
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- Timestampy
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_user_id ON ticket_attachments(user_id);

-- RLS
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "ticket_attachments_select_public_or_own_or_admin" ON ticket_attachments
FOR SELECT USING (is_public = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "ticket_attachments_insert_auth" ON ticket_attachments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ticket_attachments_delete_own_or_admin" ON ticket_attachments
FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

GRANT SELECT, INSERT ON ticket_attachments TO authenticated;
GRANT DELETE ON ticket_attachments TO authenticated;

-- =====================================================
-- 6. TABELA: ticket_timeline
-- Historia zmian zgłoszenia
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Powiązania
    ticket_id UUID NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Zdarzenie
    event_type VARCHAR(50) NOT NULL,
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,
    
    -- Metadane
    metadata JSONB,
    
    -- Timestampy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_event_type CHECK (event_type IN (
        'created', 'status_changed', 'assigned', 'comment_added', 
        'attachment_added', 'updated', 'closed', 'reopened'
    ))
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket_id ON ticket_timeline(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_created_at ON ticket_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_event_type ON ticket_timeline(event_type);

-- RLS
ALTER TABLE ticket_timeline ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "ticket_timeline_select_all" ON ticket_timeline
FOR SELECT USING (true);

CREATE POLICY "ticket_timeline_insert_auth" ON ticket_timeline
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT ON ticket_timeline TO authenticated;

-- =====================================================
-- 7. TABELA: user_files
-- Pliki użytkowników
-- =====================================================
CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Powiązania
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Dane pliku
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    
    -- Kategoria
    category VARCHAR(50) DEFAULT 'general',
    
    -- Metadane
    description TEXT,
    tags TEXT[],
    
    -- Timestampy
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_category ON user_files(category);
CREATE INDEX IF NOT EXISTS idx_user_files_created_at ON user_files(created_at DESC);

-- RLS
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "user_files_select_own_or_admin" ON user_files
FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_files_insert_own" ON user_files
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_files_delete_own_or_admin" ON user_files
FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

GRANT SELECT, INSERT, DELETE ON user_files TO authenticated;

-- =====================================================
-- 8. DODAJ POLITYKI RLS DLA ISTNIEJĄCYCH TABEL
-- =====================================================

-- Polityki dla bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_select_own_or_admin'
    ) THEN
        CREATE POLICY bookings_select_own_or_admin ON bookings
        FOR SELECT USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR public.is_admin(auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_insert_auth'
    ) THEN
        CREATE POLICY bookings_insert_auth ON bookings
        FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_update_admin'
    ) THEN
        CREATE POLICY bookings_update_admin ON bookings
        FOR UPDATE USING (public.is_admin(auth.uid()));
    END IF;
END $$;

GRANT SELECT, INSERT ON bookings TO authenticated, anon;
GRANT UPDATE, DELETE ON bookings TO authenticated;

-- Polityki dla repairs
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='repairs' AND policyname='repairs_select_own_or_admin'
    ) THEN
        CREATE POLICY repairs_select_own_or_admin ON repairs
        FOR SELECT USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR public.is_admin(auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='repairs' AND policyname='repairs_insert_auth'
    ) THEN
        CREATE POLICY repairs_insert_auth ON repairs
        FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='repairs' AND policyname='repairs_update_admin'
    ) THEN
        CREATE POLICY repairs_update_admin ON repairs
        FOR UPDATE USING (public.is_admin(auth.uid()));
    END IF;
END $$;

GRANT SELECT, INSERT ON repairs TO authenticated, anon;
GRANT UPDATE, DELETE ON repairs TO authenticated;

-- Polityki dla requests
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='requests' AND policyname='requests_select_own_or_admin'
    ) THEN
        CREATE POLICY requests_select_own_or_admin ON requests
        FOR SELECT USING (user_id = auth.uid() OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR public.is_admin(auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='requests' AND policyname='requests_insert_all'
    ) THEN
        CREATE POLICY requests_insert_all ON requests
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='requests' AND policyname='requests_update_admin'
    ) THEN
        CREATE POLICY requests_update_admin ON requests
        FOR UPDATE USING (public.is_admin(auth.uid()));
    END IF;
END $$;

GRANT SELECT, INSERT ON requests TO authenticated, anon;
GRANT UPDATE, DELETE ON requests TO authenticated;

-- =====================================================
-- SUKCES!
-- =====================================================
-- Wszystkie brakujące tabele i widoki zostały utworzone
-- Dodano polityki RLS dla bezpieczeństwa
-- Kod aplikacji powinien teraz działać poprawnie
-- =====================================================
