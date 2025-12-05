-- Test spójności customer_id vs customer_email
-- Sprawdza czy wszystkie zmiany zostały poprawnie wprowadzone

-- 1. Sprawdź czy kolumny customer_name, customer_email, customer_phone zostały usunięte z bookings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('customer_name', 'customer_email', 'customer_phone');

-- 2. Sprawdź czy kolumny customer_name, customer_email, customer_phone zostały usunięte z repairs
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'repairs' 
AND column_name IN ('customer_name', 'customer_email', 'customer_phone');

-- 3. Sprawdź czy customer_id FK nadal istnieje w bookings
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name='bookings' AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Sprawdź czy customer_id FK nadal istnieje w repairs
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name='repairs' AND tc.constraint_type = 'FOREIGN KEY';

-- 5. Sprawdź czy funkcje nadal istnieją i mają poprawną składnię
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_customer_bookings', 'get_customer_repairs_new', 'get_customer_requests')
ORDER BY routine_name;

-- 6. Sprawdź RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('bookings', 'repairs', 'requests', 'notifications', 'service_catalog')
ORDER BY tablename, policyname;

-- 7. Sprawdź czy auth.email() zostało zastąpione auth.jwt() ->> 'email'
SELECT tablename, policyname, qual
FROM pg_policies 
WHERE qual LIKE '%auth.email()%'
ORDER BY tablename, policyname;

-- 9. Sprawdź nowe triggery i funkcje
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('requests', 'repairs')
AND trigger_name IN ('set_request_id_trigger', 'set_repair_public_fields_trigger')
ORDER BY event_object_table, trigger_name;

-- 8. Sprawdź indeksy - customer_email nie powinny istnieć w bookings i repairs
SELECT tablename, indexname, indexdef
FROM pg_indexes 
WHERE tablename IN ('bookings', 'repairs', 'requests')
AND indexname LIKE '%customer_email%'
ORDER BY tablename, indexname;