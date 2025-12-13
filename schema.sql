


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."review_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."review_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_ticket_comment"("ticket_id_param" "uuid", "author_id_param" "uuid", "body_param" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_comment_id UUID;
BEGIN
    INSERT INTO public.ticket_comments (ticket_id, author_id, body)
    VALUES (ticket_id_param, author_id_param, body_param)
    RETURNING id INTO new_comment_id;
    
    RETURN new_comment_id;
END;
$$;


ALTER FUNCTION "public"."add_ticket_comment"("ticket_id_param" "uuid", "author_id_param" "uuid", "body_param" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_ticket_comment"("ticket_id_param" "uuid", "author_id_param" "uuid", "body_param" "text") IS 'Dodaje nowy komentarz do zgłoszenia';



CREATE OR REPLACE FUNCTION "public"."create_profile_for_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    _display_name text;
    _role text := 'user';
BEGIN
    _display_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'display_name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    IF LOWER(COALESCE(NEW.email, '')) = 'admin@byteclinic.pl' THEN
        _display_name := 'Administrator ByteClinic';
        _role := 'admin';
    ELSE
        _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');
    END IF;

    INSERT INTO public.profiles (
        id,
        display_name,
        full_name,
        email,
        avatar_url,
        role,
        phone,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        _display_name,
        _display_name,
        NEW.email,
        NEW.raw_user_meta_data ->> 'avatar_url',
        _role,
        NEW.raw_user_meta_data ->> 'phone',
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        COALESCE(NEW.created_at, now()),
        COALESCE(NEW.updated_at, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        metadata = COALESCE(EXCLUDED.metadata, public.profiles.metadata),
        updated_at = now();

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_profile_for_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_booking_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN 'BC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
END;
$$;


ALTER FUNCTION "public"."generate_booking_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_notification_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN 'notif_' || extract(epoch from now())::bigint::text || '_' || substr(gen_random_uuid()::text, 1, 8);
END;
$$;


ALTER FUNCTION "public"."generate_notification_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_public_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN 'BC-' ||
           UPPER(SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 4)) || '-' ||
           UPPER(SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 5, 4));
END;
$$;


ALTER FUNCTION "public"."generate_public_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_repair_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN 'BC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
END;
$$;


ALTER FUNCTION "public"."generate_repair_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_request_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTR(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 8));
END;
$$;


ALTER FUNCTION "public"."generate_request_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_secret_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN encode(
        digest(
            RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT || gen_random_uuid()::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$;


ALTER FUNCTION "public"."generate_secret_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_bookings"("customer_email_param" "text") RETURNS TABLE("booking_id" "text", "service_name" "text", "booking_date" "date", "booking_time" time without time zone, "status" "text", "price" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT b.booking_id, b.service_name, b.booking_date, b.booking_time, 
           b.status::TEXT, b.price, b.created_at
    FROM bookings b
    WHERE b.customer_email = customer_email_param
    ORDER BY b.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_customer_bookings"("customer_email_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_repairs"("customer_email_param" "text") RETURNS TABLE("repair_id" "text", "device_model" "text", "issue_description" "text", "status" "text", "progress" integer, "created_at" timestamp with time zone, "estimated_completion" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT r.repair_id, r.device_model, r.issue_description, 
           r.status::TEXT, r.progress, r.created_at, r.estimated_completion
    FROM repairs r
    WHERE r.customer_email = customer_email_param
    ORDER BY r.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_customer_repairs"("customer_email_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_repairs_new"("customer_email_param" "text") RETURNS TABLE("repair_id" "text", "device_model" "text", "issue_description" "text", "status" "text", "status_label" "text", "progress" integer, "created_at" timestamp with time zone, "estimated_completion" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT r.repair_id,
           r.device_model,
           r.issue_description,
           r.status::TEXT,
           get_repair_status_label(r.status) AS status_label,
           get_repair_progress(r.status) AS progress,
           r.created_at,
           r.estimated_completion
    FROM repairs r
    JOIN customers c ON r.customer_id = c.id
    WHERE c.email = customer_email_param
    ORDER BY r.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_customer_repairs_new"("customer_email_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_requests"("customer_email_param" "text") RETURNS TABLE("request_id" "text", "type" "text", "status" "text", "customer_name" "text", "device_type" "text", "message" "text", "created_at" timestamp with time zone, "source_page" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT r.request_id::TEXT,
           r.type::TEXT,
           r.status::TEXT,
           r.customer_name::TEXT,
           r.device_type::TEXT,
           r.message::TEXT,
           r.created_at,
           r.source_page::TEXT
    FROM requests r
    WHERE r.customer_email = customer_email_param
    ORDER BY r.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_customer_requests"("customer_email_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_repair_by_public_code"("public_code_param" "text") RETURNS TABLE("repair_id" "text", "device_type" "text", "device_model" "text", "status" "text", "progress" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "public_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT r.repair_id::TEXT,
           r.device_type::TEXT,
           r.device_model::TEXT,
           r.status::TEXT,
           r.progress,
           r.created_at,
           r.updated_at,
           r.public_code::TEXT
    FROM repairs r
    WHERE r.public_code = public_code_param
    ORDER BY r.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_repair_by_public_code"("public_code_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_repair_progress"("status_text" "text") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN CASE status_text
        WHEN 'new_request'       THEN 10
        WHEN 'open'              THEN 25
        WHEN 'waiting_for_parts' THEN 40
        WHEN 'in_repair'         THEN 70
        WHEN 'repair_completed'  THEN 90
        WHEN 'ready_for_pickup'  THEN 100
        ELSE 0
    END;
END;
$$;


ALTER FUNCTION "public"."get_repair_progress"("status_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_repair_status_label"("status_text" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN CASE status_text
        WHEN 'new_request'        THEN 'Nowe zgłoszenie'
        WHEN 'open'               THEN 'Otwarte'
        WHEN 'in_repair'          THEN 'W trakcie naprawy'
        WHEN 'waiting_for_parts'  THEN 'Oczekiwanie na części'
        WHEN 'repair_completed'   THEN 'Naprawa zakończona'
        WHEN 'ready_for_pickup'   THEN 'Gotowe do odbioru'
        ELSE status_text
    END;
END;
$$;


ALTER FUNCTION "public"."get_repair_status_label"("status_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_requests_statistics"() RETURNS TABLE("total_requests" bigint, "requests_by_type" "jsonb", "requests_by_status" "jsonb", "requests_by_priority" "jsonb", "avg_response_time" interval)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS total_requests,
        (
            SELECT jsonb_object_agg(type, count)
            FROM (
                SELECT type, COUNT(*) AS count
                FROM requests
                GROUP BY type
            ) t
        ) AS requests_by_type,
        (
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) AS count
                FROM requests
                GROUP BY status
            ) t
        ) AS requests_by_status,
        (
            SELECT jsonb_object_agg(priority, count)
            FROM (
                SELECT priority, COUNT(*) AS count
                FROM requests
                GROUP BY priority
            ) t
        ) AS requests_by_priority,
        AVG(updated_at - created_at) AS avg_response_time
    FROM requests;
END;
$$;


ALTER FUNCTION "public"."get_requests_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ticket_comments"("ticket_id_param" "uuid") RETURNS TABLE("comment_id" "uuid", "author_name" "text", "author_email" "text", "body" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id,
        COALESCE(p.full_name, u.email) as author_name,
        u.email as author_email,
        tc.body,
        tc.created_at
    FROM public.ticket_comments tc
    LEFT JOIN public.profiles p ON tc.author_id = p.id
    LEFT JOIN auth.users u ON tc.author_id = u.id
    WHERE tc.ticket_id = ticket_id_param
    ORDER BY tc.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_ticket_comments"("ticket_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ticket_comments"("ticket_id_param" "uuid") IS 'Pobiera wszystkie komentarze dla danego zgłoszenia';



CREATE OR REPLACE FUNCTION "public"."handle_auth_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    _display_name text;
    _role text := 'user';
BEGIN
    _display_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'display_name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    IF LOWER(COALESCE(NEW.email, '')) = 'admin@byteclinic.pl' THEN
        _display_name := 'Administrator ByteClinic';
        _role := 'admin';
    ELSE
        _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');
    END IF;

    INSERT INTO public.profiles (
        id, display_name, full_name, email, avatar_url,
        role, phone, metadata, created_at, updated_at
    )
    VALUES (
        NEW.id,
        _display_name,
        _display_name,
        NEW.email,
        NEW.raw_user_meta_data ->> 'avatar_url',
        _role,
        NEW.raw_user_meta_data ->> 'phone',
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        COALESCE(NEW.created_at, now()),
        COALESCE(NEW.updated_at, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        full_name    = EXCLUDED.full_name,
        email        = EXCLUDED.email,
        avatar_url   = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        phone        = COALESCE(EXCLUDED.phone, profiles.phone),
        metadata     = COALESCE(EXCLUDED.metadata, profiles.metadata),
        updated_at   = now();

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_auth_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
INSERT INTO public.profiles (id) VALUES (NEW.id);
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notifications_webhook_dispatch"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  settings_raw text := current_setting('app.settings', true);
  settings jsonb := CASE WHEN settings_raw IS NOT NULL THEN settings_raw::jsonb ELSE NULL END;
  supabase_url text := COALESCE(
    current_setting('app.settings.supabase_url', true),
    CASE WHEN settings IS NOT NULL AND settings ? 'supabase_url' THEN settings->>'supabase_url' END,
    ''
  );
  service_role_key text := COALESCE(
    current_setting('app.settings.service_role_key', true),
    CASE WHEN settings IS NOT NULL AND settings ? 'service_role_key' THEN settings->>'service_role_key' END,
    ''
  );
  headers jsonb;
  payload jsonb;
BEGIN
  IF supabase_url = '' THEN
    RAISE WARNING 'Supabase URL nie jest skonfigurowany w app.settings.supabase_url. Webhook pominięty.';
    RETURN NEW;
  END IF;

  IF service_role_key = '' THEN
    RAISE WARNING 'Service Role Key nie jest skonfigurowany w app.settings.service_role_key. Webhook pominięty.';
    RETURN NEW;
  END IF;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key,
    'apikey', service_role_key
  );

  payload := jsonb_build_object(
    'event', 'notifications.insert',
    'source', 'database-webhook',
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'record_id', NEW.notification_id,
    'record', row_to_json(NEW)
  );

  PERFORM supabase_functions.http_request(
    supabase_url || '/functions/v1/process-pending-notifications',
    'POST',
    headers,
    payload::text,
    '5000'
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notifications_webhook_dispatch"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notifications_webhook_dispatch"() IS 'Database Webhook: wysyła INSERT z notifications do process-pending-notifications przez supabase_functions.http_request';



CREATE OR REPLACE FUNCTION "public"."notify_repair_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_email TEXT := 'admin@byteclinic.pl';
    notification_subject TEXT;
    notification_html TEXT;
    notification_text TEXT;
    notification_id TEXT;
    old_status TEXT;
    new_status TEXT;
BEGIN
    -- Pobierz stary i nowy status
    old_status := OLD.status;
    new_status := NEW.status;

    -- Sprawdź czy status się zmienił
    IF old_status = new_status THEN
        RETURN NEW;
    END IF;

    -- Generuj notification_id
    notification_id := 'notif_' || extract(epoch from now())::bigint::text || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Przygotuj temat emaila
    notification_subject := '🔧 Aktualizacja naprawy #' || NEW.repair_id || ' - ' || COALESCE(NEW.status, 'Aktualizacja');
    
    -- Przygotuj treść HTML
    notification_html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ByteClinic</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Aktualizacja statusu naprawy</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin-bottom: 20px;">🔧 Aktualizacja statusu naprawy</h2>
            
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #334155;">Szczegóły naprawy:</h3>
                <p style="margin: 5px 0;"><strong>Numer naprawy:</strong> ' || NEW.repair_id || '</p>
                <p style="margin: 5px 0;"><strong>Urządzenie:</strong> ' || COALESCE(NEW.device_type, 'Nie podano') || ' ' || COALESCE(NEW.device_model, '') || '</p>
                <p style="margin: 5px 0;"><strong>Opis problemu:</strong> ' || COALESCE(NEW.issue_description, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Data przyjęcia:</strong> ' || TO_CHAR(NEW.received_at, 'YYYY-MM-DD HH24:MI') || '</p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #92400e;">👤 Dane klienta</h3>
                <p style="margin: 5px 0;"><strong>Imię:</strong> ' || COALESCE(NEW.customer_name, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:' || NEW.customer_email || '">' || NEW.customer_email || '</a></p>
                <p style="margin: 5px 0;"><strong>Telefon:</strong> <a href="tel:' || COALESCE(NEW.customer_phone, '') || '">' || COALESCE(NEW.customer_phone, 'Nie podano') || '</a></p>
            </div>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af;">📊 Status naprawy</h3>
                <p style="margin: 5px 0;"><strong>Poprzedni status:</strong> ' || COALESCE(old_status, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Aktualny status:</strong> ' || COALESCE(new_status, 'Nie podano') || '</p>
                <p style="margin: 5px 0;"><strong>Postęp:</strong> ' || COALESCE(NEW.progress, 0) || '%</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="text-align: center; color: #64748b; margin-top: 30px;">
                    <a href="mailto:' || NEW.customer_email || '" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        📧 Skontaktuj się z klientem
                    </a>
                </p>
            </div>
            
            <div style="text-align: center; color: #64748b; margin-top: 30px;">
                <p style="margin: 0; font-size: 14px;">Aktualizacja z systemu ByteClinic</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Data aktualizacji: ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI') || '</p>
            </div>
        </div>
    </div>';
    
    -- Przygotuj wersję tekstową
    notification_text := 'Aktualizacja statusu naprawy #' || NEW.repair_id || E'\n\n' ||
                        'Szczegóły naprawy:' || E'\n' ||
                        'Urządzenie: ' || COALESCE(NEW.device_type, 'Nie podano') || ' ' || COALESCE(NEW.device_model, '') || E'\n' ||
                        'Opis problemu: ' || COALESCE(NEW.issue_description, 'Nie podano') || E'\n\n' ||
                        'Dane klienta:' || E'\n' ||
                        'Imię: ' || COALESCE(NEW.customer_name, 'Nie podano') || E'\n' ||
                        'Email: ' || NEW.customer_email || E'\n' ||
                        'Telefon: ' || COALESCE(NEW.customer_phone, 'Nie podano') || E'\n\n' ||
                        'Status naprawy:' || E'\n' ||
                        'Poprzedni status: ' || COALESCE(old_status, 'Nie podano') || E'\n' ||
                        'Aktualny status: ' || COALESCE(new_status, 'Nie podano') || E'\n' ||
                        'Postęp: ' || COALESCE(NEW.progress, 0) || '%' || E'\n\n' ||
                        'Data aktualizacji: ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI');
    
    -- Wstaw powiadomienie do tabeli notifications
    INSERT INTO public.notifications (
        notification_id,
        type,
        recipient_email,
        recipient_name,
        subject,
        html_content,
        text_content,
        status,
        data,
        metadata
    ) VALUES (
        notification_id,
        'repair_status_update',
        admin_email,
        'ByteClinic Admin',
        notification_subject,
        notification_html,
        notification_text,
        'pending',
        json_build_object(
            'repair_id', NEW.repair_id,
            'customer_name', NEW.customer_name,
            'customer_email', NEW.customer_email,
            'device_type', NEW.device_type,
            'old_status', old_status,
            'new_status', new_status
        ),
        json_build_object(
            'source', 'trigger',
            'repair_id', NEW.id::text,
            'created_at', NOW()
        )
    );
    
    RAISE NOTICE 'Utworzono powiadomienie dla naprawy: %', NEW.repair_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_repair_status_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_repair_status_change"() IS 'Tworzy powiadomienie email dla administratora po zmianie statusu naprawy';



CREATE OR REPLACE FUNCTION "public"."set_repair_public_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.public_code IS NULL THEN
        NEW.public_code = generate_public_code();
    END IF;
    IF NEW.secret_token IS NULL THEN
        NEW.secret_token = generate_secret_token();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_repair_public_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_request_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF NEW.request_id IS NULL THEN
        NEW.request_id = generate_request_id();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_request_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_diagnosis_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_diagnosis_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" character varying(20) DEFAULT ('BC-'::"text" || "upper"("substr"("md5"(("random"())::"text"), 1, 8))) NOT NULL,
    "customer_id" "uuid",
    "service_type" character varying(50) NOT NULL,
    "service_name" character varying(255) NOT NULL,
    "service_description" "text",
    "device_type" character varying(50) NOT NULL,
    "device_model" character varying(255),
    "device_description" "text",
    "booking_date" "date" NOT NULL,
    "booking_time" time without time zone NOT NULL,
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "status" character varying(20) DEFAULT 'confirmed'::character varying,
    "price" numeric(10,2) DEFAULT 0,
    "currency" character varying(3) DEFAULT 'PLN'::character varying,
    "notes" "text",
    "admin_notes" "text",
    "email_confirmed_at" timestamp with time zone,
    "reminder_scheduled_at" timestamp with time zone,
    "reminder_sent_at" timestamp with time zone,
    "confirmation_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "request_id" "uuid",
    "customer_name" character varying(255) NOT NULL,
    "customer_email" character varying(255) NOT NULL,
    "customer_phone" character varying(20) NOT NULL,
    CONSTRAINT "chk_booking_date" CHECK (("booking_date" >= CURRENT_DATE)),
    CONSTRAINT "chk_price" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "chk_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'no_show'::character varying])::"text"[])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON TABLE "public"."bookings" IS 'Tabela rezerwacji wizyt w serwisie';



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "phone" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Tabela klientów - przechowuje podstawowe dane kontaktowe';



CREATE TABLE IF NOT EXISTS "public"."diagnosis_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "device" "text",
    "message" "text",
    "consent" boolean DEFAULT false NOT NULL,
    "source_url" "text",
    "user_agent" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "priority" "text" DEFAULT 'Normalny'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."diagnosis_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "text_content" "text",
    "data" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'delivered'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Ujednolicona tabela przechowująca wszystkie powiadomienia (email, sms, etc.)';



COMMENT ON COLUMN "public"."notifications"."notification_id" IS 'Unikalny identyfikator powiadomienia, np. notif_1701548400_a1b2c3d4';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Typ powiadomienia: repair_request, booking_confirmation, repair_status_update, etc.';



COMMENT ON COLUMN "public"."notifications"."data" IS 'JSON z dodatkowymi danymi specyficznymi dla typu powiadomienia';



COMMENT ON COLUMN "public"."notifications"."status" IS 'Status: pending, sent, failed, delivered';



COMMENT ON COLUMN "public"."notifications"."metadata" IS 'JSON z metadanymi technicznymi (user agent, IP, etc.)';



CREATE OR REPLACE VIEW "public"."notification_stats" WITH ("security_invoker"='on') AS
 SELECT "type",
    "status",
    "count"(*) AS "count",
    "date_trunc"('day'::"text", "created_at") AS "date"
   FROM "public"."notifications"
  GROUP BY "type", "status", ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, "type", "status";


ALTER VIEW "public"."notification_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text",
    "email" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "avatar_url" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Przechowuje publiczne profile użytkowników powiązane z kontami w auth.users. Zawiera dodatkowe dane, jak rola (user/admin).';



CREATE TABLE IF NOT EXISTS "public"."repair_timeline" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repair_id" "uuid" NOT NULL,
    "status" character varying(30) NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "technician_name" character varying(255),
    "estimated_completion" timestamp with time zone,
    "price_change" numeric(10,2),
    "notes" "text",
    "photos" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_timeline_status_new" CHECK ((("status")::"text" = ANY ((ARRAY['new_request'::character varying, 'open'::character varying, 'in_repair'::character varying, 'waiting_for_parts'::character varying, 'repair_completed'::character varying, 'ready_for_pickup'::character varying])::"text"[])))
);


ALTER TABLE "public"."repair_timeline" OWNER TO "postgres";


COMMENT ON TABLE "public"."repair_timeline" IS 'Oś czasu zmian statusu napraw';



CREATE TABLE IF NOT EXISTS "public"."repairs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repair_id" character varying(20) DEFAULT ('BC-'::"text" || "upper"("substr"("md5"(("random"())::"text"), 1, 8))) NOT NULL,
    "customer_id" "uuid",
    "device_type" character varying(50) NOT NULL,
    "device_model" character varying(255),
    "device_serial" character varying(255),
    "device_description" "text" NOT NULL,
    "issue_description" "text" NOT NULL,
    "status" character varying(30) DEFAULT 'new_request'::character varying NOT NULL,
    "progress" integer DEFAULT 0,
    "technician_id" "uuid",
    "technician_name" character varying(255),
    "received_at" timestamp with time zone DEFAULT "now"(),
    "estimated_completion" timestamp with time zone,
    "actual_completion" timestamp with time zone,
    "estimated_price" numeric(10,2),
    "final_price" numeric(10,2),
    "currency" character varying(3) DEFAULT 'PLN'::character varying,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "diagnosis" "text",
    "repair_work" "text",
    "parts_used" "jsonb",
    "last_customer_contact" timestamp with time zone,
    "priority" character varying(10) DEFAULT 'normal'::character varying,
    "status_notifications_sent" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "request_id" "uuid",
    "public_code" character varying(12),
    "secret_token" character varying(64),
    "customer_name" character varying(255) NOT NULL,
    "customer_email" character varying(255) NOT NULL,
    "customer_phone" character varying(20),
    CONSTRAINT "chk_price_positive" CHECK ((("estimated_price" >= (0)::numeric) AND (("final_price" IS NULL) OR ("final_price" >= (0)::numeric)))),
    CONSTRAINT "chk_priority" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::"text"[]))),
    CONSTRAINT "chk_progress" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "chk_status_repair_new" CHECK ((("status")::"text" = ANY ((ARRAY['new_request'::character varying, 'open'::character varying, 'in_repair'::character varying, 'waiting_for_parts'::character varying, 'repair_completed'::character varying, 'ready_for_pickup'::character varying])::"text"[]))),
    CONSTRAINT "repairs_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);


ALTER TABLE "public"."repairs" OWNER TO "postgres";


COMMENT ON TABLE "public"."repairs" IS 'Tabela śledzenia napraw urządzeń';



CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" character varying(50) DEFAULT ((('REQ-'::"text" || "to_char"("now"(), 'YYYYMMDD'::"text")) || '-'::"text") || "upper"("substr"("md5"((("random"())::"text" || (EXTRACT(epoch FROM "now"()))::"text")), 1, 8))) NOT NULL,
    "type" character varying(20) NOT NULL,
    "source_page" character varying(30) NOT NULL,
    "customer_name" character varying(255) NOT NULL,
    "customer_email" character varying(255) NOT NULL,
    "customer_phone" character varying(20),
    "device_type" character varying(50),
    "device_model" character varying(255),
    "device_description" "text",
    "message" "text",
    "source_url" "text",
    "user_agent" "text",
    "consent" boolean DEFAULT false,
    "status" character varying(20) DEFAULT 'nowe'::character varying,
    "priority" character varying(15) DEFAULT 'normalny'::character varying,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."requests" IS 'Centralna tabela wszystkich zgłoszeń w systemie ByteClinic';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "rating" integer NOT NULL,
    "title" "text",
    "message" "text" NOT NULL,
    "source_url" "text",
    "user_agent" "text",
    "status" "public"."review_status" DEFAULT 'pending'::"public"."review_status" NOT NULL,
    "approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reviews_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reviews_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reviews_id_seq" OWNED BY "public"."reviews"."id";



CREATE TABLE IF NOT EXISTS "public"."service_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_type" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "base_price" numeric(10,2) NOT NULL,
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "title" "text",
    "price_cents" integer DEFAULT 0,
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."service_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_catalog" IS 'Katalog dostępnych usług serwisowych';



CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_comments" IS 'Tabela komentarzy do zgłoszeń (tickets/requests)';



COMMENT ON COLUMN "public"."ticket_comments"."id" IS 'UUID - główny klucz tabeli';



COMMENT ON COLUMN "public"."ticket_comments"."ticket_id" IS 'UUID zgłoszenia (referencja do tabeli requests)';



COMMENT ON COLUMN "public"."ticket_comments"."author_id" IS 'UUID autora komentarza (referencja do tabeli profiles)';



COMMENT ON COLUMN "public"."ticket_comments"."body" IS 'Treść komentarza';



COMMENT ON COLUMN "public"."ticket_comments"."created_at" IS 'Data i czas utworzenia komentarza';



CREATE TABLE IF NOT EXISTS "public"."user_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "content_type" "text",
    "size" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_files" OWNER TO "postgres";


ALTER TABLE ONLY "public"."reviews" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reviews_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diagnosis_requests"
    ADD CONSTRAINT "diagnosis_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_notification_id_key" UNIQUE ("notification_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_timeline"
    ADD CONSTRAINT "repair_timeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_public_code_key" UNIQUE ("public_code");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_repair_id_key" UNIQUE ("repair_id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_secret_token_key" UNIQUE ("secret_token");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_catalog"
    ADD CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_catalog"
    ADD CONSTRAINT "service_catalog_service_type_key" UNIQUE ("service_type");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_pkey" PRIMARY KEY ("id");



CREATE INDEX "diagnosis_requests_created_idx" ON "public"."diagnosis_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "diagnosis_requests_status_idx" ON "public"."diagnosis_requests" USING "btree" ("status");



CREATE INDEX "diagnosis_requests_user_idx" ON "public"."diagnosis_requests" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_booking_id" ON "public"."bookings" USING "btree" ("booking_id");



CREATE INDEX "idx_bookings_created_at" ON "public"."bookings" USING "btree" ("created_at");



CREATE INDEX "idx_bookings_customer_email" ON "public"."bookings" USING "btree" ("customer_email");



CREATE INDEX "idx_bookings_date" ON "public"."bookings" USING "btree" ("booking_date");



CREATE INDEX "idx_bookings_request_id" ON "public"."bookings" USING "btree" ("request_id");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_customers_email" ON "public"."customers" USING "btree" ("email");



CREATE INDEX "idx_diagnosis_requests_created_at" ON "public"."diagnosis_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_diagnosis_requests_status" ON "public"."diagnosis_requests" USING "btree" ("status");



CREATE INDEX "idx_diagnosis_requests_user_id" ON "public"."diagnosis_requests" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_notification_id" ON "public"."notifications" USING "btree" ("notification_id");



CREATE INDEX "idx_notifications_recipient_email" ON "public"."notifications" USING "btree" ("recipient_email");



CREATE INDEX "idx_notifications_status" ON "public"."notifications" USING "btree" ("status");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_repair_timeline_created_at" ON "public"."repair_timeline" USING "btree" ("created_at");



CREATE INDEX "idx_repair_timeline_repair_id" ON "public"."repair_timeline" USING "btree" ("repair_id");



CREATE INDEX "idx_repairs_created_at" ON "public"."repairs" USING "btree" ("created_at");



CREATE INDEX "idx_repairs_customer_email" ON "public"."repairs" USING "btree" ("customer_email");



CREATE INDEX "idx_repairs_priority" ON "public"."repairs" USING "btree" ("priority");



CREATE INDEX "idx_repairs_public_code" ON "public"."repairs" USING "btree" ("public_code");



CREATE INDEX "idx_repairs_repair_id" ON "public"."repairs" USING "btree" ("repair_id");



CREATE INDEX "idx_repairs_request_id" ON "public"."repairs" USING "btree" ("request_id");



CREATE INDEX "idx_repairs_secret_token" ON "public"."repairs" USING "btree" ("secret_token");



CREATE INDEX "idx_repairs_status" ON "public"."repairs" USING "btree" ("status");



CREATE INDEX "idx_repairs_technician" ON "public"."repairs" USING "btree" ("technician_id");



CREATE INDEX "idx_requests_created_at" ON "public"."requests" USING "btree" ("created_at");



CREATE INDEX "idx_requests_customer_email" ON "public"."requests" USING "btree" ("customer_email");



CREATE INDEX "idx_requests_priority" ON "public"."requests" USING "btree" ("priority");



CREATE INDEX "idx_requests_request_id" ON "public"."requests" USING "btree" ("request_id");



CREATE INDEX "idx_requests_source_page" ON "public"."requests" USING "btree" ("source_page");



CREATE INDEX "idx_requests_status" ON "public"."requests" USING "btree" ("status");



CREATE INDEX "idx_requests_status_created" ON "public"."requests" USING "btree" ("status", "created_at");



CREATE INDEX "idx_requests_type" ON "public"."requests" USING "btree" ("type");



CREATE INDEX "idx_requests_type_status" ON "public"."requests" USING "btree" ("type", "status");



CREATE INDEX "reviews_approved_created_idx" ON "public"."reviews" USING "btree" ("approved", "created_at" DESC);



CREATE INDEX "reviews_user_idx" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "service_catalog_active_idx" ON "public"."service_catalog" USING "btree" ("active");



CREATE UNIQUE INDEX "service_catalog_slug_key" ON "public"."service_catalog" USING "btree" ("slug");



CREATE INDEX "ticket_comments_author_idx" ON "public"."ticket_comments" USING "btree" ("author_id");



CREATE INDEX "ticket_comments_created_at_idx" ON "public"."ticket_comments" USING "btree" ("created_at");



CREATE INDEX "ticket_comments_ticket_idx" ON "public"."ticket_comments" USING "btree" ("ticket_id");



CREATE INDEX "user_files_user_idx" ON "public"."user_files" USING "btree" ("user_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "auto_process_notifications" AFTER INSERT ON "public"."notifications" FOR EACH ROW WHEN (("new"."status" = 'pending'::"text")) EXECUTE FUNCTION "public"."notifications_webhook_dispatch"();



COMMENT ON TRIGGER "auto_process_notifications" ON "public"."notifications" IS 'Database Webhook → process-pending-notifications (INSERT + status pending)';



CREATE OR REPLACE TRIGGER "diagnosis_requests_set_updated_at" BEFORE UPDATE ON "public"."diagnosis_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "diagnosis_requests_updated_at" BEFORE UPDATE ON "public"."diagnosis_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_diagnosis_requests_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reviews_set_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_repair_public_fields_trigger" BEFORE INSERT OR UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."set_repair_public_fields"();



CREATE OR REPLACE TRIGGER "set_request_id_trigger" BEFORE INSERT OR UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_request_id"();



CREATE OR REPLACE TRIGGER "trigger_notify_repair_status_change" AFTER UPDATE ON "public"."repairs" FOR EACH ROW WHEN ((("old"."status")::"text" IS DISTINCT FROM ("new"."status")::"text")) EXECUTE FUNCTION "public"."notify_repair_status_change"();



COMMENT ON TRIGGER "trigger_notify_repair_status_change" ON "public"."repairs" IS 'Trigger wysyłający powiadomienie o zmianie statusu naprawy';



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_repair_timeline_updated_at" BEFORE UPDATE ON "public"."repair_timeline" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_repairs_updated_at" BEFORE UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_requests_updated_at" BEFORE UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_service_catalog_updated_at" BEFORE UPDATE ON "public"."service_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_files_set_updated_at" BEFORE UPDATE ON "public"."user_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id");



ALTER TABLE ONLY "public"."diagnosis_requests"
    ADD CONSTRAINT "diagnosis_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_timeline"
    ADD CONSTRAINT "repair_timeline_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_diagnosis_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."diagnosis_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_files"
    ADD CONSTRAINT "user_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can update notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can view all notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin full access" ON "public"."bookings" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admin full access" ON "public"."repairs" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admin full access on customers" ON "public"."customers" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admin full access on requests" ON "public"."requests" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can delete all diagnosis requests" ON "public"."diagnosis_requests" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all diagnosis requests" ON "public"."diagnosis_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all diagnosis requests" ON "public"."diagnosis_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow service_role all access" ON "public"."profiles" TO "service_role" WITH CHECK (true);



CREATE POLICY "Bookings: insert own by email" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK ((("customer_email")::"text" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Bookings: select own by email" ON "public"."bookings" FOR SELECT TO "authenticated" USING ((("customer_email")::"text" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Edge functions can insert notifications" ON "public"."notifications" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Everyone can view service catalog" ON "public"."service_catalog" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Public can view repair timeline by public code" ON "public"."repair_timeline" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."repairs" "r"
  WHERE (("r"."id" = "repair_timeline"."repair_id") AND ("r"."public_code" IS NOT NULL)))));



CREATE POLICY "Public read access for service_catalog" ON "public"."service_catalog" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Repairs: insert own by email" ON "public"."repairs" FOR INSERT TO "authenticated" WITH CHECK ((("customer_email")::"text" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Repairs: select own by email" ON "public"."repairs" FOR SELECT TO "authenticated" USING ((("customer_email")::"text" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Requests: public insert (validated)" ON "public"."requests" FOR INSERT TO "authenticated", "anon" WITH CHECK (((("source_page")::"text" = ANY ((ARRAY['contact'::character varying, 'cennik'::character varying, 'rezerwacja'::character varying])::"text"[])) AND ("customer_name" IS NOT NULL) AND ("btrim"(("customer_name")::"text") <> ''::"text") AND ("length"(("customer_name")::"text") <= 255) AND ("customer_email" IS NOT NULL) AND ("btrim"(("customer_email")::"text") <> ''::"text") AND ("length"(("customer_email")::"text") <= 255) AND ("btrim"(("customer_email")::"text") ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'::"text") AND (("message" IS NULL) OR ("length"("message") <= 5000))));



CREATE POLICY "Requests: select own" ON "public"."requests" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("customer_email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "Service role can manage all requests" ON "public"."requests" TO "service_role" USING (true);



CREATE POLICY "Service role can manage repair timeline" ON "public"."repair_timeline" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Ticket comments delete" ON "public"."ticket_comments" FOR DELETE USING (("public"."is_admin"("auth"."uid"()) OR ("author_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Ticket comments insert" ON "public"."ticket_comments" FOR INSERT WITH CHECK (("public"."is_admin"("auth"."uid"()) OR ("author_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Ticket comments select" ON "public"."ticket_comments" FOR SELECT USING (("public"."is_admin"("auth"."uid"()) OR ("author_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."requests" "r"
  WHERE (("r"."id" = "ticket_comments"."ticket_id") AND (("r"."user_id" = "auth"."uid"()) OR (("r"."customer_email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))))))));



CREATE POLICY "Ticket comments update" ON "public"."ticket_comments" FOR UPDATE USING (("public"."is_admin"("auth"."uid"()) OR ("author_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can create own diagnosis requests" ON "public"."diagnosis_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own customer data" ON "public"."customers" USING ((("email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))) WITH CHECK ((("email")::"text" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Users can update own customer data" ON "public"."customers" FOR UPDATE USING ((("auth"."uid"() = "id") OR (("email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own customer data" ON "public"."customers" FOR SELECT USING ((("auth"."uid"() = "id") OR (("email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "Users can view own diagnosis requests" ON "public"."diagnosis_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own repair timeline" ON "public"."repair_timeline" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."repairs" "r"
     JOIN "public"."customers" "c" ON (("r"."customer_id" = "c"."id")))
  WHERE (("r"."id" = "repair_timeline"."repair_id") AND (("c"."email")::"text" = ("auth"."jwt"() ->> 'email'::"text"))))));



CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("recipient_email" = ("auth"."jwt"() ->> 'email'::"text")));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "diagnosis_anyone_insert" ON "public"."diagnosis_requests" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



ALTER TABLE "public"."diagnosis_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "diagnosis_requests_insert_all" ON "public"."diagnosis_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "diagnosis_requests_select_all" ON "public"."diagnosis_requests" FOR SELECT USING (true);



CREATE POLICY "diagnosis_service_role_all" ON "public"."diagnosis_requests" TO "service_role" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "diagnosis_user_select_own" ON "public"."diagnosis_requests" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_public_reviewers" ON "public"."profiles" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."user_id" = "profiles"."id") AND ("r"."approved" = true)))));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."repair_timeline" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repairs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_delete_admin" ON "public"."reviews" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "reviews_insert_auth" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "reviews_select_public_or_owner_or_admin" ON "public"."reviews" FOR SELECT USING ((("approved" = true) OR ("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "reviews_update_admin" ON "public"."reviews" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."service_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_files_delete_own" ON "public"."user_files" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_files_insert_own" ON "public"."user_files" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_files_select_own" ON "public"."user_files" FOR SELECT USING (("user_id" = "auth"."uid"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_ticket_comment"("ticket_id_param" "uuid", "author_id_param" "uuid", "body_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_ticket_comment"("ticket_id_param" "uuid", "author_id_param" "uuid", "body_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_ticket_comment"("ticket_id_param" "uuid", "author_id_param" "uuid", "body_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_booking_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_booking_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_booking_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_notification_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_notification_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_notification_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_public_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_public_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_public_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_repair_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_repair_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_repair_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_request_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_request_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_request_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_secret_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_secret_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_secret_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_bookings"("customer_email_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_bookings"("customer_email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_bookings"("customer_email_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_repairs"("customer_email_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_repairs"("customer_email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_repairs"("customer_email_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_repairs_new"("customer_email_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_repairs_new"("customer_email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_repairs_new"("customer_email_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_requests"("customer_email_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_requests"("customer_email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_requests"("customer_email_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_repair_by_public_code"("public_code_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_repair_by_public_code"("public_code_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_repair_by_public_code"("public_code_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_repair_progress"("status_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_repair_progress"("status_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_repair_progress"("status_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_repair_status_label"("status_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_repair_status_label"("status_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_repair_status_label"("status_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_requests_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_requests_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_requests_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ticket_comments"("ticket_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ticket_comments"("ticket_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ticket_comments"("ticket_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notifications_webhook_dispatch"() TO "anon";
GRANT ALL ON FUNCTION "public"."notifications_webhook_dispatch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notifications_webhook_dispatch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_repair_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_repair_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_repair_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_repair_public_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_repair_public_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_repair_public_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_request_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_request_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_request_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_diagnosis_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_diagnosis_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_diagnosis_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."diagnosis_requests" TO "anon";
GRANT ALL ON TABLE "public"."diagnosis_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."diagnosis_requests" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."notification_stats" TO "anon";
GRANT ALL ON TABLE "public"."notification_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_stats" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."repair_timeline" TO "anon";
GRANT ALL ON TABLE "public"."repair_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_timeline" TO "service_role";



GRANT ALL ON TABLE "public"."repairs" TO "anon";
GRANT ALL ON TABLE "public"."repairs" TO "authenticated";
GRANT ALL ON TABLE "public"."repairs" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."service_catalog" TO "anon";
GRANT ALL ON TABLE "public"."service_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."service_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON TABLE "public"."user_files" TO "anon";
GRANT ALL ON TABLE "public"."user_files" TO "authenticated";
GRANT ALL ON TABLE "public"."user_files" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







