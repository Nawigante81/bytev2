-- =====================================================
-- Tabela reviews - pełne rozwiązanie (NAPRAWIONA WERSJA)
-- =====================================================

-- 1. Funkcja pomocnicza set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Typ enum dla statusów opinii
DO $$
BEGIN
    CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- 3. Funkcja is_admin (sprawdza czy użytkownik ma rolę admin)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role = 'admin'
  );
$$;

-- 4. Tabela reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title text,
    message text NOT NULL,
    source_url text,
    user_agent text,
    status public.review_status NOT NULL DEFAULT 'pending',
    approved boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Indeksy
CREATE INDEX IF NOT EXISTS reviews_user_idx ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS reviews_approved_created_idx ON public.reviews (approved, created_at DESC);

-- 6. Trigger dla updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'reviews_set_updated_at'
    ) THEN
        CREATE TRIGGER reviews_set_updated_at
        BEFORE UPDATE ON public.reviews
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- 7. Włączenie RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 8. Polityki RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_insert_auth'
    ) THEN
        CREATE POLICY reviews_insert_auth ON public.reviews
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_select_public_or_owner_or_admin'
    ) THEN
        CREATE POLICY reviews_select_public_or_owner_or_admin ON public.reviews
        FOR SELECT USING (approved = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_update_admin'
    ) THEN
        CREATE POLICY reviews_update_admin ON public.reviews
        FOR UPDATE USING (public.is_admin(auth.uid()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_delete_admin'
    ) THEN
        CREATE POLICY reviews_delete_admin ON public.reviews
        FOR DELETE USING (public.is_admin(auth.uid()));
    END IF;
END $$;

-- 9. Uprawnienia
GRANT SELECT, INSERT ON TABLE public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON TABLE public.reviews TO authenticated;

-- 10. Weryfikacja
SELECT 'Tabela reviews utworzona pomyślnie!' as status;