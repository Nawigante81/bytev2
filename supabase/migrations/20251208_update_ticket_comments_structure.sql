-- =====================================================
-- ByteClinic - Aktualizacja struktury tabeli ticket_comments
-- Data: 2025-12-08
-- Cel: Dostosowanie tabeli ticket_comments do nowej specyfikacji
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AKTUALIZACJA STRUKTURY TABELI ticket_comments
-- =====================================================

-- Dodanie nowych kolumn zgodnie ze specyfikacją
ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id);

-- Usunięcie starych kolumn (jeśli istnieją)
ALTER TABLE public.ticket_comments 
DROP COLUMN IF EXISTS request_id,
DROP COLUMN IF EXISTS user_id,
DROP COLUMN IF EXISTS is_private,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS updated_at;

-- Przemianowanie nowych kolumn na docelowe nazwy
DO $$
BEGIN
    -- Sprawdź czy kolumna ticket_id już istnieje (z poprzedniego ALTER TABLE)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_comments' AND column_name = 'ticket_id') THEN
        -- Kolumna ticket_id już istnieje, wszystko w porządku
        NULL;
    ELSE
        -- Jeśli nie, dodaj ją
        ALTER TABLE public.ticket_comments 
        ADD COLUMN ticket_id UUID REFERENCES public.requests(id) ON DELETE CASCADE;
    END IF;

    -- Sprawdź czy kolumna author_id już istnieje
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_comments' AND column_name = 'author_id') THEN
        -- Kolumna author_id już istnieje, wszystko w porządku
        NULL;
    ELSE
        -- Jeśli nie, dodaj ją
        ALTER TABLE public.ticket_comments 
        ADD COLUMN author_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- Usunięcie starych kolumn jeśli jeszcze istnieją
ALTER TABLE public.ticket_comments 
DROP COLUMN IF EXISTS request_id,
DROP COLUMN IF EXISTS user_id,
DROP COLUMN IF EXISTS is_private,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS updated_at;

-- Ustawienie NOT NULL dla wymaganych kolumn
ALTER TABLE public.ticket_comments 
ALTER COLUMN ticket_id SET NOT NULL,
ALTER COLUMN author_id SET NOT NULL;

-- =====================================================
-- 2. AKTUALIZACJA INDEKSÓW
-- =====================================================

-- Usuń stare indeksy
DROP INDEX IF EXISTS public.ticket_comments_request_idx;
DROP INDEX IF EXISTS public.ticket_comments_user_idx;

-- Dodaj nowe indeksy
CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_comments_author_idx ON public.ticket_comments(author_id);

-- =====================================================
-- 3. AKTUALIZACJA RLS POLICIES
-- =====================================================

-- Usuń stare polityki
DROP POLICY IF EXISTS "Ticket comments select" ON public.ticket_comments;
DROP POLICY IF EXISTS "Ticket comments insert" ON public.ticket_comments;
DROP POLICY IF EXISTS "Ticket comments update" ON public.ticket_comments;
DROP POLICY IF EXISTS "Ticket comments delete" ON public.ticket_comments;

-- Utwórz nowe polityki RLS
DO $$
BEGIN
    -- Polityka SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='Ticket comments select'
    ) THEN
        CREATE POLICY "Ticket comments select" ON public.ticket_comments
            FOR SELECT USING (
                public.is_admin(auth.uid())
                OR author_id = (SELECT id FROM public.profiles WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.requests r
                    WHERE r.id = ticket_comments.ticket_id
                      AND (
                          r.user_id = auth.uid()
                          OR r.customer_email = auth.jwt() ->> 'email'
                      )
                )
            );
    END IF;

    -- Polityka INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='Ticket comments insert'
    ) THEN
        CREATE POLICY "Ticket comments insert" ON public.ticket_comments
            FOR INSERT WITH CHECK (
                public.is_admin(auth.uid()) 
                OR author_id = (SELECT id FROM public.profiles WHERE id = auth.uid())
            );
    END IF;

    -- Polityka UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='Ticket comments update'
    ) THEN
        CREATE POLICY "Ticket comments update" ON public.ticket_comments
            FOR UPDATE USING (
                public.is_admin(auth.uid()) 
                OR author_id = (SELECT id FROM public.profiles WHERE id = auth.uid())
            );
    END IF;

    -- Polityka DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='Ticket comments delete'
    ) THEN
        CREATE POLICY "Ticket comments delete" ON public.ticket_comments
            FOR DELETE USING (
                public.is_admin(auth.uid()) 
                OR author_id = (SELECT id FROM public.profiles WHERE id = auth.uid())
            );
    END IF;
END $$;

-- =====================================================
-- 4. KOMENTARZE DOKUMENTACYJNE
-- =====================================================

COMMENT ON TABLE public.ticket_comments IS 'Tabela komentarzy do zgłoszeń (tickets/requests)';
COMMENT ON COLUMN public.ticket_comments.id IS 'UUID - główny klucz tabeli';
COMMENT ON COLUMN public.ticket_comments.ticket_id IS 'UUID zgłoszenia (referencja do tabeli requests)';
COMMENT ON COLUMN public.ticket_comments.author_id IS 'UUID autora komentarza (referencja do tabeli profiles)';
COMMENT ON COLUMN public.ticket_comments.body IS 'Treść komentarza';
COMMENT ON COLUMN public.ticket_comments.created_at IS 'Data i czas utworzenia komentarza';

-- =====================================================
-- 5. WERYFIKACJA SCHEMATU
-- =====================================================

-- Sprawdź strukturę tabeli
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_comments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Sprawdź indeksy
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'ticket_comments' 
    AND schemaname = 'public'
ORDER BY indexname;

-- Sprawdź RLS policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'ticket_comments'
ORDER BY policyname;

COMMIT;

-- =====================================================
-- INFORMACJA O ZAKOŃCZENIU
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE 'Migracja struktury tabeli ticket_comments została pomyślnie wykonana!';
    RAISE NOTICE 'Tabela została dostosowana do nowej specyfikacji:';
    RAISE NOTICE '- ticket_id (UUID, NOT NULL, REFERENCES requests.id)';
    RAISE NOTICE '- author_id (UUID, NOT NULL, REFERENCES profiles.id)';
    RAISE NOTICE '- body (TEXT, NOT NULL)';
    RAISE NOTICE '- created_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())';
    RAISE NOTICE 'RLS policies zostały zaktualizowane';
END $$;