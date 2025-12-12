-- =====================================================
-- Hotfix: requests RLS email regex dot escaping
-- Date: 2025-12-12
-- =====================================================

ALTER TABLE IF EXISTS public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requests: public insert (validated)" ON public.requests;

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

