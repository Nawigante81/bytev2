-- =====================================================
-- ByteClinic - Standaryzacja statusów i tabele pomocnicze
-- Data: 2025-12-06
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Ujednolicenie statusów napraw, osi czasu i zgłoszeń
-- =====================================================

-- Usuń stare ograniczenia statusów
ALTER TABLE repairs DROP CONSTRAINT IF EXISTS chk_status_repair_v3;
ALTER TABLE repairs DROP CONSTRAINT IF EXISTS chk_status_repair_new;
ALTER TABLE repairs DROP CONSTRAINT IF EXISTS chk_status_repair;

ALTER TABLE repair_timeline DROP CONSTRAINT IF EXISTS chk_timeline_status_v3;
ALTER TABLE repair_timeline DROP CONSTRAINT IF EXISTS chk_timeline_status_new;
ALTER TABLE repair_timeline DROP CONSTRAINT IF EXISTS chk_timeline_status;

ALTER TABLE requests DROP CONSTRAINT IF EXISTS chk_requests_status;

-- Migracja istniejących statusów w repairs
UPDATE repairs
SET status = CASE
    WHEN status IN ('received', 'new') THEN 'new_request'
    WHEN status IN ('diagnosed', 'open') THEN 'open'
    WHEN status IN ('waiting_for_parts') THEN 'waiting_for_parts'
    WHEN status IN ('in_progress') THEN 'in_repair'
    WHEN status IN ('testing') THEN 'in_repair'
    WHEN status IN ('completed', 'closed') THEN 'repair_completed'
    WHEN status IN ('ready', 'ready_for_pickup') THEN 'ready_for_pickup'
    ELSE status
END;

-- Migracja statusów w repair_timeline
UPDATE repair_timeline
SET status = CASE
    WHEN status IN ('received', 'new') THEN 'new_request'
    WHEN status IN ('diagnosed', 'open') THEN 'open'
    WHEN status IN ('waiting_for_parts') THEN 'waiting_for_parts'
    WHEN status IN ('in_progress', 'testing') THEN 'in_repair'
    WHEN status IN ('completed', 'closed') THEN 'repair_completed'
    WHEN status IN ('ready', 'ready_for_pickup') THEN 'ready_for_pickup'
    ELSE status
END;

-- Migracja statusów w requests (wcześniej wartości PL)
UPDATE requests
SET status = CASE
    WHEN status IN ('nowe', 'new') THEN 'new_request'
    WHEN status IN ('otwarte', 'open') THEN 'open'
    WHEN status IN ('w_realizacji', 'in_progress') THEN 'in_repair'
    WHEN status IN ('zakonczone', 'completed') THEN 'repair_completed'
    WHEN status IN ('ready_for_pickup', 'gotowe') THEN 'ready_for_pickup'
    ELSE status
END;

-- Ustaw domyślną wartość statusu i ograniczenia
ALTER TABLE requests ALTER COLUMN status SET DEFAULT 'new_request';

ALTER TABLE repairs
  ADD CONSTRAINT chk_status_repair_v3 CHECK (
    status IN (
      'new_request',
      'open',
      'waiting_for_parts',
      'in_repair',
      'repair_completed',
      'ready_for_pickup'
    )
  );

ALTER TABLE repair_timeline
  ADD CONSTRAINT chk_timeline_status_v3 CHECK (
    status IN (
      'new_request',
      'open',
      'waiting_for_parts',
      'in_repair',
      'repair_completed',
      'ready_for_pickup'
    )
  );

ALTER TABLE requests
  ADD CONSTRAINT chk_requests_status CHECK (
    status IN (
      'new_request',
      'open',
      'waiting_for_parts',
      'in_repair',
      'repair_completed',
      'ready_for_pickup'
    )
  );

-- Trigger logujący każdą zmianę statusu naprawy
CREATE OR REPLACE FUNCTION log_repair_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO repair_timeline (
            repair_id,
            status,
            title,
            description,
            technician_name,
            created_at
        ) VALUES (
            NEW.id,
            NEW.status,
            COALESCE(get_repair_status_label(NEW.status), 'Aktualizacja statusu'),
            COALESCE(NEW.admin_notes, 'Status został zaktualizowany'),
            COALESCE(NEW.technician_name, 'System'),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS repair_status_audit ON repairs;
CREATE TRIGGER repair_status_audit
    AFTER UPDATE ON repairs
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_repair_status_change();

-- Zapewnij, że administratorzy (profiles.role = 'admin') mają dostęp do wszystkich zgłoszeń
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'requests'
          AND policyname = 'Admins manage all requests'
    ) THEN
        CREATE POLICY "Admins manage all requests" ON public.requests
            FOR ALL TO authenticated
            USING (public.is_admin(auth.uid()))
            WITH CHECK (public.is_admin(auth.uid()));
    END IF;
END $$;

-- =====================================================
-- 2. Tabele: ticket_comments, ticket_attachments, user_files
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_comments_request_idx ON public.ticket_comments(request_id);
CREATE INDEX IF NOT EXISTS ticket_comments_user_idx ON public.ticket_comments(user_id);

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT,
    size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_attachments_request_idx ON public.ticket_attachments(request_id);
CREATE INDEX IF NOT EXISTS ticket_attachments_user_idx ON public.ticket_attachments(user_id);

CREATE TABLE IF NOT EXISTS public.user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT,
    size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_files_user_idx ON public.user_files(user_id);

-- Triggery updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ticket_comments_set_updated_at') THEN
        CREATE TRIGGER ticket_comments_set_updated_at
            BEFORE UPDATE ON public.ticket_comments
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_files_set_updated_at') THEN
        CREATE TRIGGER user_files_set_updated_at
            BEFORE UPDATE ON public.user_files
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- =====================================================
-- 3. RLS dla nowych tabel
-- =====================================================

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- Ticket comments policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='Ticket comments select'
    ) THEN
        CREATE POLICY "Ticket comments select" ON public.ticket_comments
            FOR SELECT USING (
                public.is_admin(auth.uid())
                OR user_id = auth.uid()
                OR (NOT is_private)
                OR EXISTS (
                    SELECT 1 FROM public.requests r
                    WHERE r.id = ticket_comments.request_id
                      AND (
                          r.user_id = auth.uid()
                          OR r.customer_email = auth.jwt() ->> 'email'
                      )
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='Ticket comments insert'
    ) THEN
        CREATE POLICY "Ticket comments insert" ON public.ticket_comments
            FOR INSERT WITH CHECK (
                public.is_admin(auth.uid()) OR user_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_comments' AND policyname='Ticket comments update'
    ) THEN
        CREATE POLICY "Ticket comments update" ON public.ticket_comments
            FOR UPDATE USING (
                public.is_admin(auth.uid()) OR user_id = auth.uid()
            );
    END IF;
END $$;

-- Ticket attachments policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_attachments' AND policyname='Ticket attachments select'
    ) THEN
        CREATE POLICY "Ticket attachments select" ON public.ticket_attachments
            FOR SELECT USING (
                public.is_admin(auth.uid())
                OR user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.requests r
                    WHERE r.id = ticket_attachments.request_id
                      AND (
                          r.user_id = auth.uid()
                          OR r.customer_email = auth.jwt() ->> 'email'
                      )
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_attachments' AND policyname='Ticket attachments insert'
    ) THEN
        CREATE POLICY "Ticket attachments insert" ON public.ticket_attachments
            FOR INSERT WITH CHECK (
                public.is_admin(auth.uid()) OR user_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_attachments' AND policyname='Ticket attachments delete'
    ) THEN
        CREATE POLICY "Ticket attachments delete" ON public.ticket_attachments
            FOR DELETE USING (
                public.is_admin(auth.uid()) OR user_id = auth.uid()
            );
    END IF;
END $$;

-- User files policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_files' AND policyname='User files select'
    ) THEN
        CREATE POLICY "User files select" ON public.user_files
            FOR SELECT USING (
                public.is_admin(auth.uid()) OR user_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_files' AND policyname='User files insert'
    ) THEN
        CREATE POLICY "User files insert" ON public.user_files
            FOR INSERT WITH CHECK (
                public.is_admin(auth.uid()) OR user_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_files' AND policyname='User files delete'
    ) THEN
        CREATE POLICY "User files delete" ON public.user_files
            FOR DELETE USING (
                public.is_admin(auth.uid()) OR user_id = auth.uid()
            );
    END IF;
END $$;

-- =====================================================
-- 4. Storage buckets i polityki
-- =====================================================

DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('ticket-attachments', 'ticket-attachments', false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public)
    VALUES ('user-files', 'user-files', false)
    ON CONFLICT (id) DO NOTHING;
END $$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Ticket attachments bucket policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ticket_attachments_read'
    ) THEN
        CREATE POLICY ticket_attachments_read ON storage.objects
            FOR SELECT USING (
                bucket_id = 'ticket-attachments' AND (
                    auth.role() = 'service_role'
                    OR public.is_admin(auth.uid())
                    OR owner = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ticket_attachments_insert'
    ) THEN
        CREATE POLICY ticket_attachments_insert ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'ticket-attachments' AND (
                    auth.role() = 'service_role'
                    OR auth.uid() IS NOT NULL
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ticket_attachments_delete'
    ) THEN
        CREATE POLICY ticket_attachments_delete ON storage.objects
            FOR DELETE USING (
                bucket_id = 'ticket-attachments' AND (
                    auth.role() = 'service_role'
                    OR public.is_admin(auth.uid())
                    OR owner = auth.uid()
                )
            );
    END IF;
END $$;

-- User files bucket policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='user_files_read'
    ) THEN
        CREATE POLICY user_files_read ON storage.objects
            FOR SELECT USING (
                bucket_id = 'user-files' AND (
                    auth.role() = 'service_role'
                    OR public.is_admin(auth.uid())
                    OR owner = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='user_files_insert'
    ) THEN
        CREATE POLICY user_files_insert ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'user-files' AND (
                    auth.role() = 'service_role'
                    OR auth.uid() IS NOT NULL
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='user_files_delete'
    ) THEN
        CREATE POLICY user_files_delete ON storage.objects
            FOR DELETE USING (
                bucket_id = 'user-files' AND (
                    auth.role() = 'service_role'
                    OR public.is_admin(auth.uid())
                    OR owner = auth.uid()
                )
            );
    END IF;
END $$;

COMMIT;
