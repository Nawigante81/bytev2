-- =====================================================
-- Migracja: Aktualizacja konta administratora
-- Data: 2025-12-05
-- Cel: Ustawić admin@byteclinic.pl jako jedyne konto admin
-- =====================================================

-- KROK 1: Usuń wszystkich istniejących adminów z tabeli profiles
DELETE FROM public.profiles WHERE role = 'admin';

-- KROK 2: Aktualizuj użytkownika auth.admin@byteclinic.pl na admin w profiles
-- Najpierw sprawdź czy użytkownik admin@byteclinic.pl istnieje w auth.users
-- Jeśli tak, zaktualizuj jego profil na admin
UPDATE public.profiles 
SET role = 'admin', display_name = 'Administrator ByteClinic'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'admin@byteclinic.pl'
);

-- KROK 3: Jeśli nie ma profilu dla admin@byteclinic.pl, utwórz go
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Znajdź ID użytkownika admin@byteclinic.pl w auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@byteclinic.pl';
    
    -- Jeśli użytkownik istnieje, utwórz profil
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, role, created_at, updated_at)
        VALUES (
            admin_user_id,
            'Administrator ByteClinic',
            'admin',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            display_name = 'Administrator ByteClinic',
            updated_at = NOW();
    END IF;
END $$;

-- KROK 4: Przywróć pełne polityki RLS z obsługą ról admin

-- Usuń tymczasowe uproszczone polityki
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS reviews_select_public_or_owner ON public.reviews;
DROP POLICY IF EXISTS reviews_update_owner ON public.reviews;
DROP POLICY IF EXISTS reviews_delete_owner ON public.reviews;

-- Usuń funkcję set_updated_at jeśli istnieje (zostanie odtworzona)
DROP FUNCTION IF EXISTS public.set_updated_at();

-- Przywróć funkcję set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

-- Przywróć funkcję is_admin
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

-- Przywróć polityki RLS dla profiles
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY profiles_insert_admin ON public.profiles
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

-- Przywróć polityki RLS dla reviews
CREATE POLICY reviews_insert_auth ON public.reviews
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY reviews_select_public_or_owner_or_admin ON public.reviews
FOR SELECT USING (approved = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY reviews_update_admin ON public.reviews
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY reviews_delete_admin ON public.reviews
FOR DELETE USING (public.is_admin(auth.uid()));

-- Przywróć polityki RLS dla notifications
-- Usuń stare uproszczone polityki
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- Przywróć pełne polityki notifications
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

CREATE POLICY "Users can view their notifications" 
  ON notifications FOR SELECT 
  TO authenticated 
  USING (recipient_email = auth.jwt() ->> 'email');

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

CREATE POLICY "Edge functions can insert notifications" 
  ON notifications FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- KROK 5: Ustaw właściwe uprawnienia
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated, service_role;

-- KROK 6: Sprawdź czy migracja się udała
-- Sprawdź czy admin@byteclinic.pl ma rolę admin
SELECT 
    au.email,
    p.role,
    p.display_name,
    p.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'admin@byteclinic.pl';

-- Sprawdź czy funkcja is_admin działa
SELECT public.is_admin() as current_user_is_admin;

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

-- =====================================================
-- SUKCES!
-- =====================================================