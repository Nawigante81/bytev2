# 🚀 Szczegółowa instrukcja wdrożenia na produkcję

## 📋 Przygotowanie

### 1. Ustaw zmiennych środowiskowych

```bash
# W terminalu na maszynie z projektem
export SUPABASE_URL="https://TWÓJ-PROJEKT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="twój_service_role_key_z_supabase"
export RESEND_API_KEY="twój_klucz_api_z_resend"
export MAIL_FROM="Serwis ByteClinic <serwis@byteclinic.pl>"
```

## 🔧 Wdrożenie migracji bazy danych

### 2. Wgraj migracje na PROD

```bash
# Na maszynie z Supabase self-host
cd /ścieżka/do/projektu

# Opcja 1: Użyj narzędzia supabase CLI
npx supabase db push

# Opcja 2: Ręczne wykonanie przez psql
psql -h localhost -U postgres -d postgres -f supabase/migrations/20251210_setup_auto_notifications.sql
```

### 3. Weryfikacja migracji

```sql
-- Sprawdź czy migracja przeszła bez błędów
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'auto_process_notifications';

-- Powinieneś zobaczyć:
-- tgname                     | tgrelid
-- ---------------------------+---------
-- auto_process_notifications | notifications
```

## 🔌 Konfiguracja rozszerzeń

### 4. Włącz pg_net w PROD

```sql
-- W Supabase Dashboard > SQL Editor lub przez psql
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Weryfikacja
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';

-- Oczekiwany wynik:
-- extname | extversion
-- --------+-----------
-- pg_net  | 1.0
```

## ⚙️ Konfiguracja GUC

### 5. Ustaw GUC z service_role_key

```sql
-- Metoda 1: Przez ALTER SYSTEM (wymaga restartu)
ALTER SYSTEM SET app.settings = '{"service_role_key":"TWÓJ_SERVICE_ROLE_KEY"}';
SELECT pg_reload_conf();

-- Metoda 2: Przez ALTER DATABASE (działa natychmiast)
ALTER DATABASE postgres SET app.settings = '{"service_role_key":"TWÓJ_SERVICE_ROLE_KEY"}';

-- Weryfikacja
SELECT current_setting('app.settings', true) AS service_role_key_config;

-- Oczekiwany wynik:
-- service_role_key_config
-- -----------------------
-- {"service_role_key": "TWÓJ_SERVICE_ROLE_KEY"}
```

## 🔐 Konfiguracja sekretów

### 6. Wdroż funkcję process-pending-notifications

```bash
# Wdrożenie funkcji
npx supabase functions deploy process-pending-notifications

# Ustawienie sekretów
npx supabase secrets set RESEND_API_KEY="twój_klucz_api_z_resend"
npx supabase secrets set MAIL_FROM="Serwis ByteClinic <serwis@byteclinic.pl>"
npx supabase secrets set ADMIN_EMAIL="admin@byteclinic.pl"
```

### 7. Weryfikacja sekretów

```bash
# Sprawdź czy sekrety są poprawnie ustawione
npx supabase secrets list

# Powinieneś zobaczyć:
# RESEND_API_KEY: ************
# MAIL_FROM: ************
# ADMIN_EMAIL: ************
```

## 🧪 Testowanie systemu

### 8. Sprawdź czy trigger istnieje i jest aktywny

```sql
-- Sprawdź trigger
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname ILIKE '%notifications%' AND NOT tgisinternal;

-- Sprawdź funkcję triggera
SELECT proname as function_name
FROM pg_proc
WHERE proname = 'trigger_process_pending_notifications';
```

### 9. Uruchom test end-to-end

```bash
# Uruchom test
node test-notification-system.js

# Oczekiwany wynik:
# ✅ Trigger istnieje i jest aktywny
# ✅ Powiadomienie dodane: test_1234567890
# ✅ Powiadomienie zostało wysłane pomyślnie!
# 🎉 Test zakończony sukcesem!
```

## 📊 Monitoring i debugowanie

### 10. Monitoruj logi

```bash
# Logi funkcji (Supabase CLI)
npx supabase functions logs process-pending-notifications

# Logi Dockera (jeśli używasz kontenerów)
docker logs supabase-db
docker logs supabase-functions
```

### 11. Sprawdź tabelę notifications

```sql
-- Monitoruj status powiadomień
SELECT notification_id, status, created_at, updated_at, error_message
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

### 12. Sprawdź Resend

1. Zaloguj się do panelu Resend: https://resend.com
2. Przejdź do sekcji "Sending"
3. Sprawdź czy pojawił się testowy email

## 💡 Rozwiązywanie problemów

### Typowe problemy i rozwiązania:

**Problem:** Trigger nie wywołuje funkcji
- **Rozwiązanie:** Sprawdź czy pg_net jest włączone i GUC jest poprawnie ustawione

**Problem:** Email nie jest wysyłany
- **Rozwiązanie:** Sprawdź czy RESEND_API_KEY i MAIL_FROM są poprawnie skonfigurowane

**Problem:** Status pozostaje "pending"
- **Rozwiązanie:** Sprawdź logi funkcji process-pending-notifications

**Problem:** Błąd autoryzacji
- **Rozwiązanie:** Upewnij się, że service_role_key w GUC jest poprawny

## ✅ Potwierdzenie sukcesu

System działa poprawnie gdy:
1. Trigger `auto_process_notifications` istnieje i jest aktywny
2. Tabela `notifications` zawiera rekordy ze statusem "sent"
3. Email pojawił się w panelu Resend
4. Logi funkcji pokazują udane przetworzenie

## 📝 Notatki

- Pamiętaj o restarcie connection pool po zmianie GUC
- W przypadku problemów sprawdź logi Postgres i Edge Functions
- Upewnij się, że wszystkie zmienne środowiskowe są poprawnie ustawione
- Testuj najpierw na środowisku stagingowym przed wdrożeniem na produkcję