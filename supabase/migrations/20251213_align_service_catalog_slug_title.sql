-- Align legacy `service_catalog` schema with the app expectations (slug/title/price_cents/active).
-- Safe to run multiple times.

ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS price_cents integer;
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS active boolean;

-- Backfill from legacy columns when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_catalog' AND column_name = 'service_type'
  ) THEN
    UPDATE public.service_catalog
      SET slug = COALESCE(slug, service_type)
    WHERE slug IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_catalog' AND column_name = 'name'
  ) THEN
    UPDATE public.service_catalog
      SET title = COALESCE(title, name)
    WHERE title IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_catalog' AND column_name = 'base_price'
  ) THEN
    UPDATE public.service_catalog
      SET price_cents = COALESCE(price_cents, ROUND(base_price * 100)::int)
    WHERE price_cents IS NULL OR price_cents = 0;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_catalog' AND column_name = 'is_active'
  ) THEN
    UPDATE public.service_catalog
      SET active = COALESCE(active, is_active)
    WHERE active IS NULL;
  END IF;
END $$;

ALTER TABLE public.service_catalog ALTER COLUMN active SET DEFAULT true;
UPDATE public.service_catalog SET active = true WHERE active IS NULL;

ALTER TABLE public.service_catalog ALTER COLUMN price_cents SET DEFAULT 0;
UPDATE public.service_catalog SET price_cents = 0 WHERE price_cents IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_catalog_slug_key ON public.service_catalog (slug);
CREATE INDEX IF NOT EXISTS service_catalog_active_idx ON public.service_catalog (active);
