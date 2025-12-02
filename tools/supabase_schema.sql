-- Supabase schema for Tech-Majster app
-- Creates enums, tables, relationships, triggers, functions, RLS policies
-- to support: email/Google/GitHub auth, profiles, diagnosis tickets,
-- reviews + moderation, ticket comments, service orders, and helper RPCs.
--
-- Safe to run multiple times (idempotent via IF NOT EXISTS or DO guards where possible).

-- 1) Extensions commonly used
create extension if not exists pgcrypto;

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE public.diagnosis_status AS ENUM ('new','open','in_progress','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Utility functions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

-- (moved is_admin() definition to after profiles table creation)

-- Expose Postgres version (for tools/diagnose-supabase.mjs)
CREATE OR REPLACE FUNCTION public.version()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT version();
$$;

-- Allow calling the version() RPC from anon/authenticated (used by diagnostics)
GRANT EXECUTE ON FUNCTION public.version() TO anon, authenticated;

-- 4) Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- If the table existed before and lacked the 'role' column, add it safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user','admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_set_updated_at'
  ) THEN
    CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Define is_admin() after profiles table exists
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

-- Bootstrap profile row on new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END
$$;

-- Attach trigger to auth.users (create once)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 5) Diagnosis Tickets
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
  status public.diagnosis_status NOT NULL DEFAULT 'new',
  priority text DEFAULT 'Normalny',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- If the table existed before and lacked the 'status' column, add it safely
ALTER TABLE public.diagnosis_requests
  ADD COLUMN IF NOT EXISTS status public.diagnosis_status;
ALTER TABLE public.diagnosis_requests
  ALTER COLUMN status SET DEFAULT 'new';
UPDATE public.diagnosis_requests SET status = 'new' WHERE status IS NULL;
ALTER TABLE public.diagnosis_requests
  ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS diagnosis_requests_user_idx ON public.diagnosis_requests (user_id);
CREATE INDEX IF NOT EXISTS diagnosis_requests_status_idx ON public.diagnosis_requests (status);
CREATE INDEX IF NOT EXISTS diagnosis_requests_created_idx ON public.diagnosis_requests (created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'diagnosis_requests_set_updated_at'
  ) THEN
    CREATE TRIGGER diagnosis_requests_set_updated_at
    BEFORE UPDATE ON public.diagnosis_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 6) Reviews with moderation
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

-- If the table existed before and lacked the 'status' or 'approved' columns, add them safely
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS status public.review_status;
ALTER TABLE public.reviews
  ALTER COLUMN status SET DEFAULT 'pending';
UPDATE public.reviews SET status = 'pending' WHERE status IS NULL;
ALTER TABLE public.reviews
  ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS approved boolean;
ALTER TABLE public.reviews
  ALTER COLUMN approved SET DEFAULT false;
UPDATE public.reviews SET approved = false WHERE approved IS NULL;
ALTER TABLE public.reviews
  ALTER COLUMN approved SET NOT NULL;

CREATE INDEX IF NOT EXISTS reviews_user_idx ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS reviews_approved_created_idx ON public.reviews (approved, created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'reviews_set_updated_at'
  ) THEN
    CREATE TRIGGER reviews_set_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 7) Ticket Comments (future UI: TicketStatus comments)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id bigserial PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.diagnosis_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_private boolean NOT NULL DEFAULT false, -- admins-only when true
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx ON public.ticket_comments (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS ticket_comments_user_idx ON public.ticket_comments (user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ticket_comments_set_updated_at'
  ) THEN
    CREATE TRIGGER ticket_comments_set_updated_at
    BEFORE UPDATE ON public.ticket_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Ticket comments moderation additions
ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.ticket_comments ALTER COLUMN status SET DEFAULT 'visible';
UPDATE public.ticket_comments SET status = 'visible' WHERE status IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_comments_status_check'
  ) THEN
    ALTER TABLE public.ticket_comments ADD CONSTRAINT ticket_comments_status_check CHECK (status IN ('visible','hidden','rejected'));
  END IF;
END $$;
ALTER TABLE public.ticket_comments ALTER COLUMN status SET NOT NULL;
CREATE INDEX IF NOT EXISTS ticket_comments_status_idx ON public.ticket_comments (status);

-- 8) Service catalog and orders (used by OrderModal)
-- 7b) Ticket Attachments (metadata for storage files)
CREATE TABLE IF NOT EXISTS public.ticket_attachments (

  id bigserial PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.diagnosis_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path text NOT NULL, -- path inside storage bucket
  file_name text NOT NULL,
  content_type text,
  size bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_idx ON public.ticket_attachments (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS ticket_attachments_user_idx ON public.ticket_attachments (user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ticket_attachments_set_updated_at'
  ) THEN
    CREATE TRIGGER ticket_attachments_set_updated_at
    BEFORE UPDATE ON public.ticket_attachments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 8) Service catalog and orders (used by OrderModal)
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'service_catalog_set_updated_at'
  ) THEN
    CREATE TRIGGER service_catalog_set_updated_at
    BEFORE UPDATE ON public.service_catalog
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- If the table existed before and lacked the 'slug' column or its constraints, add them safely
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS slug text;
-- Ensure other required columns exist if table was created earlier without them
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS active boolean;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS updated_at timestamptz;
-- Optional pricing column: ensure it exists and is safe for inserts
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS price_cents integer;
-- Set defaults and not-null where applicable
ALTER TABLE public.service_catalog ALTER COLUMN active SET DEFAULT true;
UPDATE public.service_catalog SET active = COALESCE(active, true);
ALTER TABLE public.service_catalog ALTER COLUMN active SET NOT NULL;
ALTER TABLE public.service_catalog ALTER COLUMN created_at SET DEFAULT now();
UPDATE public.service_catalog SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.service_catalog ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.service_catalog ALTER COLUMN updated_at SET DEFAULT now();
UPDATE public.service_catalog SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.service_catalog ALTER COLUMN updated_at SET NOT NULL;
-- Ensure price_cents has a default and no NULLs to satisfy potential NOT NULL constraint
ALTER TABLE public.service_catalog ALTER COLUMN price_cents SET DEFAULT 0;
UPDATE public.service_catalog SET price_cents = COALESCE(price_cents, 0);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_catalog' AND column_name='price_cents'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.service_catalog WHERE price_cents IS NULL
  ) THEN
    ALTER TABLE public.service_catalog ALTER COLUMN price_cents SET NOT NULL;
  END IF;
END $$;
-- Migrate legacy column 'name' to 'title' if present, then drop 'name'
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_catalog' AND column_name='name'
  ) THEN
    -- Backfill title from name where needed
    UPDATE public.service_catalog SET title = COALESCE(title, name);
    -- Drop legacy column to avoid NOT NULL violations on future inserts
    BEGIN
      ALTER TABLE public.service_catalog DROP COLUMN name;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;
END $$;

-- Enforce NOT NULL on title only if there are no NULLs remaining
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_catalog' AND column_name='title'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.service_catalog WHERE title IS NULL
  ) THEN
    ALTER TABLE public.service_catalog ALTER COLUMN title SET NOT NULL;
  END IF;
END $$;
-- Backfill any NULL slugs with generated unique values to satisfy NOT NULL/UNIQUE
UPDATE public.service_catalog
SET slug = 'svc-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 12)
WHERE slug IS NULL;
-- Ensure UNIQUE constraint exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_catalog_slug_key'
  ) THEN
    ALTER TABLE public.service_catalog ADD CONSTRAINT service_catalog_slug_key UNIQUE (slug);
  END IF;
END $$;
-- Ensure NOT NULL
ALTER TABLE public.service_catalog ALTER COLUMN slug SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  source_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- If the table existed before and lacked the 'status' column, add it safely
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.service_orders
  ALTER COLUMN status SET DEFAULT 'new';
UPDATE public.service_orders SET status = 'new' WHERE status IS NULL;
ALTER TABLE public.service_orders
  ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS service_orders_service_idx ON public.service_orders (service_id);
CREATE INDEX IF NOT EXISTS service_orders_user_idx ON public.service_orders (user_id);
CREATE INDEX IF NOT EXISTS service_orders_status_idx ON public.service_orders (status);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'service_orders_set_updated_at'
  ) THEN
    CREATE TRIGGER service_orders_set_updated_at
    BEFORE UPDATE ON public.service_orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 9) Row Level Security (RLS)
-- Enable RLS (safe if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_own'
  ) THEN
  CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- Allow the public (anon) to SELECT minimal profile rows for users who have at least one approved review,
-- so that public reviews can show the author's display name. Combined with column selection in the app,
-- this reveals only 'display_name'.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_public_reviewers'
  ) THEN
    CREATE POLICY profiles_select_public_reviewers ON public.profiles
    FOR SELECT TO anon
    USING (
      EXISTS (
        SELECT 1 FROM public.reviews r
        WHERE r.user_id = profiles.id AND r.approved = true
      )
    );
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_delete_admin'
  ) THEN
  CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- DIAGNOSIS_REQUESTS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='diagnosis_requests' AND policyname='diagnosis_insert_anyone'
  ) THEN
    CREATE POLICY diagnosis_insert_anyone ON public.diagnosis_requests
    FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='diagnosis_requests' AND policyname='diagnosis_select_owner_or_admin'
  ) THEN
  CREATE POLICY diagnosis_select_owner_or_admin ON public.diagnosis_requests
  FOR SELECT USING ((user_id = auth.uid()) OR public.is_admin(auth.uid()) OR (user_id IS NULL AND public.is_admin(auth.uid())));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='diagnosis_requests' AND policyname='diagnosis_update_admin'
  ) THEN
  CREATE POLICY diagnosis_update_admin ON public.diagnosis_requests
  FOR UPDATE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='diagnosis_requests' AND policyname='diagnosis_delete_admin'
  ) THEN
  CREATE POLICY diagnosis_delete_admin ON public.diagnosis_requests
  FOR DELETE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- REVIEWS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_insert_auth'
  ) THEN
    CREATE POLICY reviews_insert_auth ON public.reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_select_public_or_owner_or_admin'
  ) THEN
  CREATE POLICY reviews_select_public_or_owner_or_admin ON public.reviews
  FOR SELECT USING (approved = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_update_admin'
  ) THEN
  CREATE POLICY reviews_update_admin ON public.reviews
  FOR UPDATE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_delete_admin'
  ) THEN
  CREATE POLICY reviews_delete_admin ON public.reviews
  FOR DELETE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- TICKET_COMMENTS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='ticket_comments_select_scoped'
  ) THEN
    CREATE POLICY ticket_comments_select_scoped ON public.ticket_comments
    FOR SELECT USING (
      public.is_admin(auth.uid()) OR (
        NOT is_private AND EXISTS (
          SELECT 1 FROM public.diagnosis_requests dr
          WHERE dr.id = ticket_id AND dr.user_id = auth.uid()
        )
      ) OR (
        user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- TICKET_ATTACHMENTS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_attachments' AND policyname='ticket_attachments_select_scoped'
  ) THEN
    CREATE POLICY ticket_attachments_select_scoped ON public.ticket_attachments
    FOR SELECT USING (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.diagnosis_requests dr
        WHERE dr.id = ticket_id AND (dr.user_id = auth.uid())
      ) OR (user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_attachments' AND policyname='ticket_attachments_insert_scoped'
  ) THEN
    CREATE POLICY ticket_attachments_insert_scoped ON public.ticket_attachments
    FOR INSERT WITH CHECK (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.diagnosis_requests dr
        WHERE dr.id = ticket_id AND dr.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_attachments' AND policyname='ticket_attachments_delete_author_or_admin'
  ) THEN
  CREATE POLICY ticket_attachments_delete_author_or_admin ON public.ticket_attachments
  FOR DELETE USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
  END IF;
END $$;

-- Storage policies for 'ticket-attachments' bucket
-- Allow owners of the ticket (based on first path segment equal to ticket_id) or admin
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ticket_attachments_read'
  ) THEN
    CREATE POLICY "ticket_attachments_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'ticket-attachments' AND (
        EXISTS (
          SELECT 1 FROM public.diagnosis_requests dr
          WHERE dr.id::text = split_part(name, '/', 1) AND (dr.user_id = auth.uid())
        ) OR public.is_admin(auth.uid())
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ticket_attachments_insert'
  ) THEN
    CREATE POLICY "ticket_attachments_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'ticket-attachments' AND (
        EXISTS (
          SELECT 1 FROM public.diagnosis_requests dr
          WHERE dr.id::text = split_part(name, '/', 1) AND (dr.user_id = auth.uid())
        ) OR public.is_admin(auth.uid())
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ticket_attachments_delete'
  ) THEN
    CREATE POLICY "ticket_attachments_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'ticket-attachments' AND (
        EXISTS (
          SELECT 1 FROM public.diagnosis_requests dr
          WHERE dr.id::text = split_part(name, '/', 1) AND (dr.user_id = auth.uid())
        ) OR public.is_admin(auth.uid())
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='ticket_comments_insert_scoped'
  ) THEN
    CREATE POLICY ticket_comments_insert_scoped ON public.ticket_comments
    FOR INSERT WITH CHECK (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.diagnosis_requests dr
        WHERE dr.id = ticket_id AND dr.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='ticket_comments_update_author_or_admin'
  ) THEN
  CREATE POLICY ticket_comments_update_author_or_admin ON public.ticket_comments
  FOR UPDATE USING (public.is_admin(auth.uid()) OR (user_id = auth.uid() AND is_private = false));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='ticket_comments_delete_author_or_admin'
  ) THEN
  CREATE POLICY ticket_comments_delete_author_or_admin ON public.ticket_comments
  FOR DELETE USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
  END IF;
END $$;

-- Override ticket_comments select policy to include status moderation
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='ticket_comments_select_scoped'
  ) THEN
    EXECUTE 'DROP POLICY ticket_comments_select_scoped ON public.ticket_comments';
  END IF;
  CREATE POLICY ticket_comments_select_scoped ON public.ticket_comments
  FOR SELECT USING (
    public.is_admin(auth.uid()) OR (
      status = 'visible' AND NOT is_private AND EXISTS (
        SELECT 1 FROM public.diagnosis_requests dr
        WHERE dr.id = ticket_id AND dr.user_id = auth.uid()
      )
    ) OR (
      user_id = auth.uid()
    )
  );
END $$;

-- SERVICE_CATALOG policies

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_catalog' AND policyname='service_catalog_select_public'
  ) THEN
  CREATE POLICY service_catalog_select_public ON public.service_catalog
  FOR SELECT USING (active = true OR public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_catalog' AND policyname='service_catalog_admin_all'
  ) THEN
  CREATE POLICY service_catalog_admin_all ON public.service_catalog
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Allow inserts from anyone (anonymous or authenticated) to match the public Order form UX
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_orders' AND policyname='service_orders_insert_auth'
  ) THEN
    EXECUTE 'DROP POLICY service_orders_insert_auth ON public.service_orders';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_orders' AND policyname='service_orders_insert_anyone'
  ) THEN
    CREATE POLICY service_orders_insert_anyone ON public.service_orders
    FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_orders' AND policyname='service_orders_select_owner_or_admin'
  ) THEN
  CREATE POLICY service_orders_select_owner_or_admin ON public.service_orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR (user_id IS NULL AND public.is_admin(auth.uid())));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_orders' AND policyname='service_orders_update_admin'
  ) THEN
  CREATE POLICY service_orders_update_admin ON public.service_orders
  FOR UPDATE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_orders' AND policyname='service_orders_delete_admin'
  ) THEN
  CREATE POLICY service_orders_delete_admin ON public.service_orders
  FOR DELETE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 10) Admin helpers
CREATE OR REPLACE FUNCTION public.make_admin_by_email(email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles p
  SET role = 'admin'
  FROM auth.users u
  WHERE p.id = u.id AND lower(u.email) = lower(email);
END
$$;

CREATE OR REPLACE FUNCTION public.make_user_by_email(email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles p
  SET role = 'user'
  FROM auth.users u
  WHERE p.id = u.id AND lower(u.email) = lower(email);
END
$$;

-- 11) Optional: storage bucket for ticket attachments (future UI)
DO $$ BEGIN
  PERFORM storage.create_bucket(
    bucket_id => 'ticket-attachments',
    public => false,
    file_size_limit => 10485760,
    allowed_mime_types => ARRAY['image/*','application/pdf']
  );
EXCEPTION WHEN undefined_function THEN
  NULL;
WHEN others THEN
  NULL;
END $$;

-- 12) Grants (RLS will further restrict row-level access)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.diagnosis_requests TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON TABLE public.reviews TO authenticated;
GRANT SELECT ON TABLE public.service_catalog TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_orders TO anon, authenticated;
  
  -- PROFILES auto-creation trigger and self-manage policies
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE p.proname = 'handle_new_user' AND n.nspname='public'
    ) THEN
      CREATE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      begin
        insert into public.profiles (id, display_name)
        values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
        on conflict (id) do nothing;
        return new;
      end;
      $$;
    END IF;
  END $$;
  
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
      CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    END IF;
  END $$;
  
  -- Backfill missing profiles for existing users
  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, split_part(u.email, '@', 1)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
  
  -- RLS: allow users to manage their own profile rows
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_self'
    ) THEN
      CREATE POLICY profiles_insert_self ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);
    END IF;
  END $$;
  
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_self'
    ) THEN
      CREATE POLICY profiles_select_self ON public.profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = id OR public.is_admin(auth.uid()));
    END IF;
  END $$;
  
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_self'
    ) THEN
      CREATE POLICY profiles_update_self ON public.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id OR public.is_admin(auth.uid()))
      WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
    END IF;
  END $$;

-- 13) User Files (for general attachments not tied to a ticket)
CREATE TABLE IF NOT EXISTS public.user_files (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  size bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_files_user_idx ON public.user_files (user_id, created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'user_files_set_updated_at'
  ) THEN
    CREATE TRIGGER user_files_set_updated_at
    BEFORE UPDATE ON public.user_files
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_files' AND policyname='user_files_select_owner_or_admin'
  ) THEN
  CREATE POLICY user_files_select_owner_or_admin ON public.user_files
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_files' AND policyname='user_files_insert_owner_only'
  ) THEN
  CREATE POLICY user_files_insert_owner_only ON public.user_files
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_files' AND policyname='user_files_delete_owner_or_admin'
  ) THEN
  CREATE POLICY user_files_delete_owner_or_admin ON public.user_files
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- Storage bucket and policies for 'user-files'
DO $$ BEGIN
  PERFORM storage.create_bucket(
    bucket_id => 'user-files',
    public => false,
    file_size_limit => 10485760,
    allowed_mime_types => ARRAY['image/*','application/pdf','text/plain']
  );
EXCEPTION WHEN undefined_function THEN
  NULL;
WHEN others THEN
  NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='user_files_read'
  ) THEN
    CREATE POLICY "user_files_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'user-files' AND (
        split_part(name, '/', 1) = auth.uid()::text OR public.is_admin(auth.uid())
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='user_files_insert'
  ) THEN
    CREATE POLICY "user_files_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'user-files' AND (
        split_part(name, '/', 1) = auth.uid()::text OR public.is_admin(auth.uid())
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='user_files_delete'
  ) THEN
    CREATE POLICY "user_files_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'user-files' AND (
        split_part(name, '/', 1) = auth.uid()::text OR public.is_admin(auth.uid())
      )
    );
  END IF;
END $$;

-- End of schema

-- 14) Optional seed data for service_catalog (safe upserts by slug)
-- These match the slugs used in src/pages/Home.jsx and other pages
INSERT INTO public.service_catalog (slug, title, description, active)
VALUES
  ('diag-pc', 'Diagnoza laptop/PC', 'Pełna analiza HW/SW, raport + kosztorys.', true),
  ('czyszczenie-pasta', 'Czyszczenie układu chłodzenia + pasta/termopady', 'Rozbiórka, wymiana, test temperatur.', true),
  ('system-reinstall', 'Instalacja / konfiguracja systemu', 'Windows/Linux/macOS, sterowniki, pakiet startowy.', true),
  ('optymalizacja', 'Optymalizacja i usuwanie malware', 'Tuning, czyszczenie autostartu, zabezpieczenia.', true),
  ('networking', 'Sieci i Wi-Fi (konfiguracja/naprawa)', 'Routery/AP, poprawa zasięgu i bezpieczeństwa.', true),
  ('mobile-service', 'Serwis urządzeń mobilnych', 'Diagnoza, baterie, ekrany, gniazda.', true),
  ('iot-electronics', 'Elektronika / IoT (ESP32, Arduino)', 'Czujniki, sterowniki, projekty custom.', true),
  ('servers-virtualization', 'Serwery / wirtualizacja / backup', 'NAS, Proxmox, Docker, monitoring.', true),
  ('diag-online', 'Diagnoza online (zdalna)', 'Szybkie wskazanie problemu + kosztorys.', true),
  ('data-recovery', 'Odzysk danych (wstępna analiza)', 'Próba odzyskania danych z uszkodzonych nośników.', true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  updated_at = now();

