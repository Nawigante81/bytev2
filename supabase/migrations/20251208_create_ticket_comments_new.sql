-- =====================================================
-- ByteClinic - Utworzenie nowej tabeli ticket_comments
-- Data: 2025-12-08
-- Cel: Utworzenie tabeli ticket_comments zgodnie ze specyfikacją
-- =====================================================

BEGIN;

-- =====================================================
-- 1. UTWORZENIE NOWEJ TABELI ticket_comments
-- =====================================================

-- Usuń starą tabelę jeśli istnieje i zawiera dane testowe
DROP TABLE IF EXISTS public.ticket_comments CASCADE;

-- Utwórz nową tabelę zgodnie ze specyfikacją
CREATE TABLE public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Włącz RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. UTWORZENIE INDEKSÓW
-- =====================================================

CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_comments_author_idx ON public.ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS ticket_comments_created_at_idx ON public.ticket_comments(created_at);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

DO $$
BEGIN
    -- Polityka SELECT - wszyscy mogą czytać komentarze
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

    -- Polityka INSERT - tylko zalogowani mogą dodawać
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

    -- Polityka UPDATE - tylko autor lub admin
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

    -- Polityka DELETE - tylko autor lub admin
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
-- 5. FUNKCJE POMOCNICZE
-- =====================================================

-- Funkcja do dodawania komentarza do zgłoszenia
CREATE OR REPLACE FUNCTION add_ticket_comment(
    ticket_id_param UUID,
    author_id_param UUID,
    body_param TEXT
)
RETURNS UUID AS $$
DECLARE
    new_comment_id UUID;
BEGIN
    INSERT INTO public.ticket_comments (ticket_id, author_id, body)
    VALUES (ticket_id_param, author_id_param, body_param)
    RETURNING id INTO new_comment_id;
    
    RETURN new_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do pobierania komentarzy zgłoszenia
CREATE OR REPLACE FUNCTION get_ticket_comments(ticket_id_param UUID)
RETURNS TABLE (
    comment_id UUID,
    author_name TEXT,
    author_email TEXT,
    body TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id,
        COALESCE(p.full_name, u.email) as author_name,
        u.email as author_email,
        tc.body,
        tc.created_at
    FROM public.ticket_comments tc
    LEFT JOIN public.profiles p ON tc.author_id = p.id
    LEFT JOIN auth.users u ON tc.author_id = u.id
    WHERE tc.ticket_id = ticket_id_param
    ORDER BY tc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_ticket_comment(UUID, UUID, TEXT) IS 'Dodaje nowy komentarz do zgłoszenia';
COMMENT ON FUNCTION get_ticket_comments(UUID) IS 'Pobiera wszystkie komentarze dla danego zgłoszenia';

-- =====================================================
-- 6. WERYFIKACJA SCHEMATU
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

-- Sprawdź funkcje
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('add_ticket_comment', 'get_ticket_comments')
ORDER BY routine_name;

COMMIT;

-- =====================================================
-- INFORMACJA O ZAKOŃCZENIU
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE 'Migracja utworzenia nowej tabeli ticket_comments została pomyślnie wykonana!';
    RAISE NOTICE 'Tabela została utworzona zgodnie ze specyfikacją:';
    RAISE NOTICE '- ticket_id (UUID, NOT NULL, REFERENCES requests.id)';
    RAISE NOTICE '- author_id (UUID, NOT NULL, REFERENCES profiles.id)';
    RAISE NOTICE '- body (TEXT, NOT NULL)';
    RAISE NOTICE '- created_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())';
    RAISE NOTICE 'RLS policies zostały utworzone';
    RAISE NOTICE 'Dodano funkcje pomocnicze: add_ticket_comment, get_ticket_comments';
END $$;