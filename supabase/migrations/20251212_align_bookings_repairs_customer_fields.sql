-- =====================================================
-- Align schema to project expectations (safe with data)
-- Date: 2025-12-12
-- Adds missing customer_* fields to bookings/repairs and backfills from customers/requests.
-- Designed to be idempotent and non-destructive.
-- =====================================================

-- 1) Add missing columns (nullable first)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

-- 2) Backfill from customers if customer_id is present
UPDATE public.bookings b
SET
  customer_name = COALESCE(b.customer_name, c.name),
  customer_email = COALESCE(b.customer_email, c.email),
  customer_phone = COALESCE(b.customer_phone, c.phone)
FROM public.customers c
WHERE b.customer_id = c.id;

UPDATE public.repairs r
SET
  customer_name = COALESCE(r.customer_name, c.name),
  customer_email = COALESCE(r.customer_email, c.email),
  customer_phone = COALESCE(r.customer_phone, c.phone)
FROM public.customers c
WHERE r.customer_id = c.id;

-- 3) Backfill from requests if request_id is present
UPDATE public.bookings b
SET
  customer_name = COALESCE(b.customer_name, req.customer_name),
  customer_email = COALESCE(b.customer_email, req.customer_email),
  customer_phone = COALESCE(b.customer_phone, req.customer_phone)
FROM public.requests req
WHERE b.request_id = req.id;

UPDATE public.repairs r
SET
  customer_name = COALESCE(r.customer_name, req.customer_name),
  customer_email = COALESCE(r.customer_email, req.customer_email),
  customer_phone = COALESCE(r.customer_phone, req.customer_phone)
FROM public.requests req
WHERE r.request_id = req.id;

-- 3b) Legacy data: bookings.customer_phone may be missing in old rows.
-- Project expects NOT NULL for new bookings; for historical rows set a safe placeholder.
UPDATE public.bookings
SET customer_phone = 'Nie podano'
WHERE customer_name IS NOT NULL
  AND customer_email IS NOT NULL
  AND (customer_phone IS NULL OR btrim(customer_phone) = '');

-- 3c) Broken legacy rows: missing all customer fields and no links.
-- Keep the record (data exists), but mark as cancelled and fill placeholders
-- so schema constraints can be applied without deleting production data.
UPDATE public.bookings
SET
  customer_name = 'Nieznany',
  customer_email = 'unknown+' || booking_id || '@byteclinic.invalid',
  customer_phone = 'Nie podano',
  status = 'cancelled',
  notes = COALESCE(notes, 'Legacy: brak danych klienta (uzupełniono placeholder)')
WHERE customer_id IS NULL
  AND request_id IS NULL
  AND customer_name IS NULL
  AND customer_email IS NULL
  AND customer_phone IS NULL;

-- 4) Create indexes used by code/migrations (safe if already exist)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON public.bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_repairs_customer_email ON public.repairs(customer_email);

-- 5) Remove redundant FK constraints if present (non-fatal)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_request_id'
      AND conrelid IN ('public.bookings'::regclass, 'public.repairs'::regclass)
  ) THEN
    -- Names collide across tables; drop per table if exists.
    EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS fk_request_id';
    EXECUTE 'ALTER TABLE public.repairs DROP CONSTRAINT IF EXISTS fk_request_id';
  END IF;
END $$;

-- 6) Enforce NOT NULL only when safe (won't break existing rows)
DO $$
DECLARE
  missing_bookings int;
  missing_repairs int;
BEGIN
  SELECT COUNT(*) INTO missing_bookings
  FROM public.bookings
  WHERE customer_name IS NULL OR customer_email IS NULL OR customer_phone IS NULL;

  IF missing_bookings = 0 THEN
    ALTER TABLE public.bookings
      ALTER COLUMN customer_name SET NOT NULL,
      ALTER COLUMN customer_email SET NOT NULL,
      ALTER COLUMN customer_phone SET NOT NULL;
  ELSE
    RAISE NOTICE 'bookings: skip NOT NULL (missing rows=%)', missing_bookings;
  END IF;

  SELECT COUNT(*) INTO missing_repairs
  FROM public.repairs
  WHERE customer_name IS NULL OR customer_email IS NULL;

  IF missing_repairs = 0 THEN
    ALTER TABLE public.repairs
      ALTER COLUMN customer_name SET NOT NULL,
      ALTER COLUMN customer_email SET NOT NULL;
  ELSE
    RAISE NOTICE 'repairs: skip NOT NULL (missing rows=%)', missing_repairs;
  END IF;
END $$;
