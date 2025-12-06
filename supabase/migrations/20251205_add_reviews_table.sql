-- =====================================================
-- Migracja: Dodanie tabeli reviews + zależności
-- Data: 2025-12-05
-- Rozwiązuje błąd: "could not find table 'public.reviews' in the schema cache"
-- =====================================================

-- 1. Funkcja pomocnicza set_updated_at()
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

-- 2. Utworzenie typu enum dla statusów opinii
DO $$ BEGIN
    CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Tabela profiles (wymagana przez reviews)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dodanie kolumny role jeśli nie istnieje
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

-- 4. Funkcja is_admin()
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

-- 5. Trigger dla profiles updated_at
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_set_updated_at'
    ) THEN
        CREATE TRIGGER profiles_set_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- 6. Włączenie RLS dla profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Polityki RLS dla profiles
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_own'
    ) THEN
        CREATE POLICY profiles_select_own ON public.profiles
        FOR SELECT USING (id = auth.uid() OR public.is_admin(auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own'
    ) THEN
        CREATE POLICY profiles_update_own ON public.profiles
        FOR UPDATE USING (id = auth.uid() OR public.is_admin(auth.uid()));
    END IF;
END $$;

-- 8. Uprawnienia dla profiles
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

-- 9. Utworzenie tabeli reviews
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

-- 3. Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS reviews_user_idx ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS reviews_approved_created_idx ON public.reviews (approved, created_at DESC);

-- 4. Trigger dla automatycznego updated_at
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'reviews_set_updated_at'
    ) THEN
        CREATE TRIGGER reviews_set_updated_at
        BEFORE UPDATE ON public.reviews
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- 5. Włączenie RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 6. Polityki RLS dla tabeli reviews
-- Pozwala na wstawianie opinii tylko przez zalogowanych użytkowników
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_insert_auth'
    ) THEN
        CREATE POLICY reviews_insert_auth ON public.reviews
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Pozwala na odczyt zatwierdzonych opinii, własnych opinii lub dla adminów
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_select_public_or_owner_or_admin'
    ) THEN
    CREATE POLICY reviews_select_public_or_owner_or_admin ON public.reviews
    FOR SELECT USING (approved = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));
    END IF;
END $$;

-- Pozwala na aktualizację tylko przez adminów
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_update_admin'
    ) THEN
    CREATE POLICY reviews_update_admin ON public.reviews
    FOR UPDATE USING (public.is_admin(auth.uid()));
    END IF;
END $$;

-- Pozwala na usuwanie tylko przez adminów
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_delete_admin'
    ) THEN
    CREATE POLICY reviews_delete_admin ON public.reviews
    FOR DELETE USING (public.is_admin(auth.uid()));
    END IF;
END $$;

-- 7. Uprawnienia
GRANT SELECT, INSERT ON TABLE public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON TABLE public.reviews TO authenticated;

-- =====================================================
-- WERYFIKACJA
-- =====================================================

-- Sprawdzenie czy tabela została utworzona
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'reviews';

-- Sprawdzenie czy typ enum został utworzony
SELECT 
    t.typname,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'review_status'
GROUP BY t.typname;

-- =====================================================
-- SUKCES!
-- =====================================================