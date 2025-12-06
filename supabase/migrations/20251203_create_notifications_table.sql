-- Migracja: Tabela powiadomień
-- Data: 2025-12-03
-- Cel: Przechowywanie wysłanych powiadomień email

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id TEXT UNIQUE NOT NULL, -- Unikalny identyfikator powiadomienia
  type TEXT NOT NULL, -- Typ powiadomienia (repair_request, booking_confirmation, etc.)
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  data JSONB, -- Dodatkowe dane związane z powiadomieniem
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT, -- Komunikat błędu w przypadku niepowodzenia
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB, -- Dodatkowe metadane (user agent, IP, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email ON notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_id ON notifications(notification_id);

-- RLS (Row Level Security) - tylko admini mogą przeglądać wszystkie powiadomienia
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Polityka dla adminów
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Admin can view all notifications'
  ) THEN
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
  END IF;
END $$;

-- Polityka dla użytkowników - mogą przeglądać tylko swoje powiadomienia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their notifications'
  ) THEN
    CREATE POLICY "Users can view their notifications" 
      ON notifications FOR SELECT 
      TO authenticated 
      USING (recipient_email = auth.email());
  END IF;
END $$;

-- Edge Functions mogą tworzyć powiadomienia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Edge functions can insert notifications'
  ) THEN
    CREATE POLICY "Edge functions can insert notifications" 
      ON notifications FOR INSERT 
      TO service_role 
      WITH CHECK (true);
  END IF;
END $$;

-- Admini mogą aktualizować status powiadomień
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Admin can update notifications'
  ) THEN
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
  END IF;
END $$;

-- Trigger do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_notifications_updated_at'
  ) THEN
    CREATE TRIGGER update_notifications_updated_at 
      BEFORE UPDATE ON notifications 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Funkcja pomocnicza do generowania notification_id
CREATE OR REPLACE FUNCTION generate_notification_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'notif_' || extract(epoch from now())::bigint::text || '_' || substr(gen_random_uuid()::text, 1, 8);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  type,
  status,
  COUNT(*) as count,
  DATE_TRUNC('day', created_at) as date
FROM notifications
GROUP BY type, status, DATE_TRUNC('day', created_at)
ORDER BY date DESC, type, status;

-- Komentarze do dokumentacji
COMMENT ON TABLE notifications IS 'Tabela przechowująca wszystkie wysłane powiadomienia email';
COMMENT ON COLUMN notifications.notification_id IS 'Unikalny identyfikator powiadomienia, np. notif_1701548400_a1b2c3d4';
COMMENT ON COLUMN notifications.type IS 'Typ powiadomienia: repair_request, booking_confirmation, repair_status_update, etc.';
COMMENT ON COLUMN notifications.status IS 'Status: pending, sent, failed, delivered';
COMMENT ON COLUMN notifications.data IS 'JSON z dodatkowymi danymi specyficznymi dla typu powiadomienia';
COMMENT ON COLUMN notifications.metadata IS 'JSON z metadanymi technicznymi (user agent, IP, etc.)';