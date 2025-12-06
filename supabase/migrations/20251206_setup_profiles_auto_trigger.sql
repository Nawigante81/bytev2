-- =====================================================
-- Migracja: Automatyczne tworzenie rekordów w public.profiles
-- Data: 2025-12-05
-- Cel: Zapewnić, że każdy nowy użytkownik w auth.users otrzyma profil
-- =====================================================

-- 1. Upewnij się, że tabela profiles istnieje (bez modyfikacji jeśli już jest)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    display_name text,
    avatar_url text,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    is_admin boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Rozszerzenie struktury tabeli o brakujące kolumny zgodne z aplikacją i skryptami serwisowymi
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean;
ALTER TABLE public.profiles ALTER COLUMN is_admin SET DEFAULT false;
UPDATE public.profiles SET is_admin = (role = 'admin') WHERE is_admin IS NULL;
ALTER TABLE public.profiles ALTER COLUMN is_admin SET NOT NULL;

-- 3. Wypełnienie istniejących brakujących kolumn danymi z auth.users
UPDATE public.profiles p
SET 
    email = COALESCE(p.email, u.email),
    full_name = COALESCE(p.full_name, p.display_name, SPLIT_PART(u.email, '@', 1)),
    display_name = COALESCE(p.display_name, p.full_name, SPLIT_PART(u.email, '@', 1)),
    metadata = COALESCE(NULLIF(metadata, '{}'::jsonb), '{}'::jsonb),
    is_admin = (role = 'admin')
FROM auth.users u
WHERE u.id = p.id;

-- 4. Backfill profili dla istniejących użytkowników auth.users bez wpisów w public.profiles
INSERT INTO public.profiles (id, display_name, full_name, email, role, is_admin, created_at, updated_at)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data ->> 'full_name',
             u.raw_user_meta_data ->> 'display_name',
             SPLIT_PART(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data ->> 'full_name',
             u.raw_user_meta_data ->> 'display_name',
             SPLIT_PART(u.email, '@', 1)),
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'role', 'user'),
    COALESCE(u.raw_user_meta_data ->> 'role', 'user') = 'admin',
    COALESCE(u.created_at, now()),
    COALESCE(u.updated_at, now())
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 5. Funkcja tworząca profil dla świeżo zarejestrowanego użytkownika
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _display_name text;
    _role text := 'user';
BEGIN
    _display_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'display_name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    IF LOWER(COALESCE(NEW.email, '')) = 'admin@byteclinic.pl' THEN
        _display_name := 'Administrator ByteClinic';
        _role := 'admin';
    ELSE
        _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');
    END IF;

    INSERT INTO public.profiles (
        id,
        display_name,
        full_name,
        email,
        avatar_url,
        role,
        is_admin,
        phone,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        _display_name,
        _display_name,
        NEW.email,
        NEW.raw_user_meta_data ->> 'avatar_url',
        _role,
        (_role = 'admin'),
        NEW.raw_user_meta_data ->> 'phone',
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        COALESCE(NEW.created_at, now()),
        COALESCE(NEW.updated_at, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        role = EXCLUDED.role,
        is_admin = EXCLUDED.is_admin,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        metadata = COALESCE(EXCLUDED.metadata, public.profiles.metadata),
        updated_at = now();

    RETURN NEW;
END;
$$;

-- 6. Trigger na auth.users odpalający funkcję po każdej rejestracji
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_new_user();

-- 7. Weryfikacja (opcjonalne zapytania kontrolne)
-- SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;
-- SELECT COUNT(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL;

-- =====================================================
-- KONIEC MIGRACJI
-- =====================================================
