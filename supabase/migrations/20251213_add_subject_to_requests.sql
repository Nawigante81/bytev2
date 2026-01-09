-- Dodanie pola subject do tabeli requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'requests'
          AND column_name = 'subject'
    ) THEN
        ALTER TABLE public.requests
        ADD COLUMN subject TEXT;
    END IF;
END $$;
