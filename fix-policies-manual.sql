-- Fix Infinite Recursion in Profiles Policies
-- This SQL script addresses the infinite recursion issue in Supabase policies

-- 1. Drop all problematic policies that cause infinite recursion
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public_reviewers ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

-- 2. Create new policies without circular dependencies
-- Users can select their own profile
CREATE POLICY profiles_select_own_simple ON public.profiles
FOR SELECT USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY profiles_insert_self_simple ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY profiles_update_own_simple ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow public to see profiles with approved reviews (without using is_admin function)
CREATE POLICY profiles_select_public_reviewers ON public.profiles
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.user_id = profiles.id AND r.approved = true
  )
);

-- 3. Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS public.diagnosis_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  device text,
  message text,
  consent boolean NOT NULL DEFAULT false,
  source_url text,
  user_agent text,
  status text NOT NULL DEFAULT 'new',
  priority text DEFAULT 'Normalny',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  size bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS and create basic policies for missing tables
ALTER TABLE public.diagnosis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- Basic policies for diagnosis_requests
DROP POLICY IF EXISTS diagnosis_requests_select_all ON public.diagnosis_requests;
CREATE POLICY diagnosis_requests_select_all ON public.diagnosis_requests
FOR SELECT USING (true);

DROP POLICY IF EXISTS diagnosis_requests_insert_all ON public.diagnosis_requests;
CREATE POLICY diagnosis_requests_insert_all ON public.diagnosis_requests
FOR INSERT WITH CHECK (true);

-- Basic policies for user_files
DROP POLICY IF EXISTS user_files_select_own ON public.user_files;
CREATE POLICY user_files_select_own ON public.user_files
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_files_insert_own ON public.user_files;
CREATE POLICY user_files_insert_own ON public.user_files
FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. Grant necessary permissions
GRANT ALL ON public.diagnosis_requests TO anon, authenticated;
GRANT ALL ON public.user_files TO anon, authenticated;