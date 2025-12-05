-- =====================================================
-- Migracja: Naprawa polityk RLS (Row Level Security)
-- Data: 2025-12-05
-- Rozwiązuje błąd: "role admin does not exist" w politykach RLS
-- =====================================================

-- Tymczasowo usuń problematyczne polityki RLS które sprawdzają role admin
-- Te polityki będą przywrócone po pełnej konfiguracji bazy danych

-- Usuń polityki z tabeli profiles które używają funkcji is_admin
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

-- Usuń polityki z tabeli reviews które używają funkcji is_admin  
DROP POLICY IF EXISTS reviews_select_public_or_owner_or_admin ON public.reviews;
DROP POLICY IF EXISTS reviews_update_admin ON public.reviews;
DROP POLICY IF EXISTS reviews_delete_admin ON public.reviews;

-- Usuń polityki z tabeli notifications które sprawdzają role admin
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admin can view all notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Admin can update notifications" ON public.notifications;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Utwórz uproszczone polityki RLS bez sprawdzania ról admin

-- Nowe polityki dla profiles (tylko własne dane)
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE USING (id = auth.uid());

-- Nowe polityki dla reviews (uproszczone)
CREATE POLICY reviews_select_public_or_owner ON public.reviews
FOR SELECT USING (approved = true OR user_id = auth.uid());

CREATE POLICY reviews_update_owner ON public.reviews
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY reviews_delete_owner ON public.reviews
FOR DELETE USING (user_id = auth.uid());

-- Nowe polityki dla notifications (uproszczone)
CREATE POLICY "Users can view their notifications" 
  ON notifications FOR SELECT 
  TO authenticated 
  USING (recipient_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their notifications" 
  ON notifications FOR UPDATE 
  TO authenticated 
  USING (recipient_email = auth.jwt() ->> 'email');

-- Upewnij się że tabela profiles ma kolumnę display_name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Dodaj uprawnienia do authenticated
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;

-- =====================================================
-- WERYFIKACJA
-- =====================================================

-- Sprawdź czy polityki zostały utworzone
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'reviews', 'notifications')
ORDER BY tablename, policyname;

-- Sprawdź strukturę tabeli profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- =====================================================
-- SUKCES!
-- =====================================================