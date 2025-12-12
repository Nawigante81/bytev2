-- =====================================================
-- Fix RLS policies (reduce public access)
-- Date: 2025-12-12
-- Requirements:
-- - Bookings: only for logged-in users (or service_role via edge functions)
-- - Contact form: available for everyone (anon + authenticated) via requests table
-- =====================================================

-- Ensure RLS enabled
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- bookings
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.bookings;
DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;

-- View own bookings by email (logged-in)
CREATE POLICY "Bookings: select own by email"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (customer_email = (auth.jwt() ->> 'email'));

-- Allow direct insert only for logged-in users, and only for their email
-- (Edge functions using service_role bypass RLS anyway.)
CREATE POLICY "Bookings: insert own by email"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_email = (auth.jwt() ->> 'email'));

-- -----------------------------------------------------
-- repairs
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.repairs;
DROP POLICY IF EXISTS "Public can view repair by public code" ON public.repairs;
DROP POLICY IF EXISTS "Users can view their own" ON public.repairs;
DROP POLICY IF EXISTS "Users can view own repairs" ON public.repairs;
DROP POLICY IF EXISTS "Users can insert own repairs" ON public.repairs;

-- View own repairs by email (logged-in)
CREATE POLICY "Repairs: select own by email"
  ON public.repairs
  FOR SELECT
  TO authenticated
  USING (customer_email = (auth.jwt() ->> 'email'));

-- Allow direct insert only for logged-in users, and only for their email
CREATE POLICY "Repairs: insert own by email"
  ON public.repairs
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_email = (auth.jwt() ->> 'email'));

-- -----------------------------------------------------
-- requests
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Public can insert requests" ON public.requests;
DROP POLICY IF EXISTS "Allow anonymous insert for requests" ON public.requests;
DROP POLICY IF EXISTS "Public can view approved requests" ON public.requests;
DROP POLICY IF EXISTS "Customers can view own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Authenticated users can view own requests" ON public.requests;

-- Insert allowed for contact/pricing/booking forms (anon + authenticated)
-- Keep constraints simple and resilient (prevents totally arbitrary spam payloads).
CREATE POLICY "Requests: public insert (validated)"
  ON public.requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    source_page IN ('contact', 'cennik', 'rezerwacja')
    AND customer_name IS NOT NULL
    AND btrim(customer_name) <> ''
    AND length(customer_name) <= 255
    AND customer_email IS NOT NULL
    AND btrim(customer_email) <> ''
    AND length(customer_email) <= 255
    AND btrim(customer_email) ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    AND (message IS NULL OR length(message) <= 5000)
  );

-- Select for authenticated owners (by user_id or email)
CREATE POLICY "Requests: select own"
  ON public.requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_email = (auth.jwt() ->> 'email')
  );

-- -----------------------------------------------------
-- profiles
-- -----------------------------------------------------
-- Remove unconditional public read; keep targeted policies (own profile, reviewers view)
DROP POLICY IF EXISTS "Allow public read access" ON public.profiles;
