# Raport poprawek bazy danych ByteClinic

## ✅ Zakończone poprawki

### 1. Naprawiono błędy SQL - Dollar-quoting
**Problem**: Użyto niepoprawnej składni `AS $` zamiast `AS $$`
**Rozwiązanie**: Poprawiono wszystkie funkcje na poprawną składnię dollar-quoting
```sql
-- PRZED (błędne):
CREATE OR REPLACE FUNCTION set_request_id()
RETURNS TRIGGER AS $

-- PO (poprawne):
CREATE OR REPLACE FUNCTION set_request_id()
RETURNS TRIGGER AS $$
```

### 2. Spójność customer_id vs customer_email
**Problem**: Mieszanie pól customer_id (FK) z customer_email w tabelach bookings i repairs
**Rozwiązanie**: 
- ❌ Usunięto zduplikowane pola: `customer_name`, `customer_email`, `customer_phone` z tabel `bookings` i `repairs`
- ✅ Zachowano tylko `customer_id` (FK do tabeli `customers`)
- ✅ Zaktualizowano funkcje aby JOIN-owały z tabelą `customers`
- ✅ Poprawiono RLS policies

### 3. Brakujące funkcje trigger
**Problem**: Triggery wołały nieistniejące funkcje
**Rozwiązanie**: Dodano funkcje:
- `set_request_id()` - automatyczne generowanie request_id
- `set_repair_public_fields()` - automatyczne generowanie public_code i secret_token

### 4. RLS dla publicznych formularzy
**Problem**: System wymagał logowania dla publicznych rezerwacji
**Rozwiązanie**: 
- ✅ Dodano polityki `"Public can insert bookings"` dla `anon, authenticated`
- ✅ Zachowano polityki dla zalogowanych użytkowników
- ❌ **ZUS**: Usunięto politykę publicznego dostępu do tworzenia napraw (bezpieczeństwo)

### 5. auth.email() → auth.jwt()
**Problem**: Użyto nieistniejącej funkcji `auth.email()`
**Rozwiązanie**: Zastąpiono przez `auth.jwt() ->> 'email'` w politykach

### 6. RLS dla service_catalog
**Problem**: Cennik był niedostępny dla niezalogowanych
**Rozwiązanie**: Dodano dostęp dla `anon, authenticated`

### 7. RAISE NOTICE
**Problem**: Polecenia `RAISE NOTICE` powodują błędy w Supabase SQL Editor
**Rozwiązanie**: Usunięto wszystkie komunikaty `RAISE NOTICE`

### 8. Polityki bezpieczeństwa
**Poprawki bezpieczeństwa**:
- ❌ **Usunięto**: `"Public can insert repairs"` - zgłoszenia napraw tylko przez backend/Edge Functions
- ⚠️ **Komentarz**: `"Public can view repair by public code"` - teoretyczny dostęp do wszystkich publicznych napraw

## 📋 Podsumowanie

### ✅ Poprawne elementy:
- Centralna tabela `requests` z pełną funkcjonalnością
- Powiązania `requests → bookings/repairs` przez `request_id`
- Spójna architektura z tabelą `customers` jako centralnym repozytorium danych klienta
- RLS policies dostosowane do wymagań (publiczne rezerwacje, chronione naprawy)
- Wszystkie funkcje z poprawną składnią dollar-quoting

### ⚠️ Elementy wymagające uwagi:
- Publiczny dostęp do śledzenia napraw - teoretycznie można pobrać wszystkie publiczne naprawy
- Zgłoszenia napraw wymagają implementacji przez Edge Functions lub panel admin

### 📁 Pliki:
- `supabase/baza_danych_kompletna.sql` - główny plik z poprawkami
- `supabase/baza_danych_kompletna_CORRECTED.sql` - kopia zapasowa z poprawkami
- `test-customer-consistency.sql` - skrypt testowy weryfikacyjny

**Status**: ✅ Baza danych jest gotowa do wdrożenia w Supabase SQL Editor

## 🔄 Planowane aktualizacje (grudzień 2025)

1. **Ujednolicenie statusów napraw i zgłoszeń**
   - Zmiana kolumn `status` w `repairs`, `repair_timeline`, `requests` oraz w widokach/ funkcjach pomocniczych na docelowe wartości: `new_request`, `open`, `waiting_for_parts`, `in_repair`, `repair_completed`, `ready_for_pickup`.
   - Migracja istniejących danych + aktualizacja funkcji (`get_repair_status_label`, `get_repair_progress`, `get_customer_repairs_new`).
   - Dodanie triggera `log_repair_status_change()` zapisującego każdą zmianę statusu w `repair_timeline` dla spójnych danych w panelu klienta.

2. **Centralna tabela zgłoszeń i powiązania**
   - Wdrożenie migracji `20251205_create_central_requests_table.sql` (plus poprawki) żeby `requests` stało się jedynym źródłem prawdy dla formularzy kontaktowych, diag modal itp.
   - Dodanie kolumn referencyjnych (`request_id`) w `ticket_comments`, `ticket_attachments`, `user_files` oraz powiązanie z `repairs`/`bookings`.
   - Przygotowanie funkcji `create_request_with_relations` (już w migracji) jako jedynego punktu insercji – będzie wywoływana z Edge Function.

3. **Nowe tabele wspierające panel klienta**
   - `ticket_comments` (komentarze publiczne/prywatne) – kolumny: `id`, `request_id`, `user_id`, `body`, `is_private`, `status`, timestamps.
   - `ticket_attachments` – meta danych + `storage_path` do bucketu `ticket-attachments`.
   - `user_files` – prywatne repo klienta (`user_id`, `storage_path`, `file_name`, `size`, `created_at`).
   - Każda tabela z kompletem indeksów oraz RLS (właściciel ↔ admin via `is_admin`).

4. **Storage Buckets + polityki**
   - Utworzenie bucketów `ticket-attachments` i `user-files` (jeśli nie istnieją) wraz z politykami:
     - użytkownik może `upload/read/remove` swoje pliki;
     - admin (service_role) ma pełny dostęp;
     - podpisane URLe tworzone tylko przez Edge Function.
   - Dodanie helperów w Supabase CLI (`supabase storage list-buckets`, `supabase storage create-bucket ...`).

5. **Edge Functions i powiadomienia**
   - Implementacja brakującej funkcji `notify-system` (obecnie katalog pusty) obsługującej wszystkie szablony maili z `emailService` + zapis do tabeli `notifications`.
   - Aktualizacja `notify-repair-status-change` i `notify-new-diagnosis`, żeby dodawały `user_id` (jeśli znany) i korzystały z nowych statusów.
   - Refaktoryzacja `emailService` → jedna funkcja `notify-system` zamiast wielu nieistniejących (`notify-booking-confirmation`, `notify-repair-ready`, ...).
   - `booking-api` i `create-booking` mają rejestrować wpis w `requests` + `email_notifications` oraz uruchamiać `notify-system` (service role key, bezpośrednio backend).

6. **Bezpieczne operacje administracyjne**
   - Usunięcie bezpośredniego użycia `supabase.auth.admin` w przeglądarce (`UserManagement.jsx`).
   - Edge Function `admin-console` (service role) z autoryzacją JWT (rola admin) udostępniająca minimalne operacje (lista użytkowników, zmiana roli, reset hasła).
   - Aktualizacja RLS w `profiles`, `reviews`, `notifications` żeby użyć `public.is_admin()` oraz zablokować operacje dla zwykłych anon użytkowników.

7. **Proces CLI / DevOps**
   - Dodać `supabase/config.toml` z `project_id = "wllxicmacmfzmqdnovhp"`, `studio_port`, `api_port` itd., by komendy CLI działały bez flag interaktywnych.
   - Sekwencja wdrożenia:

       ```pwsh
       supabase link --project-ref wllxicmacmfzmqdnovhp
       supabase db push
       supabase functions deploy booking-api
       supabase functions deploy notify-system
       supabase functions deploy notify-repair-status-change
       supabase functions deploy notify-new-diagnosis
       ```

   - Po wdrożeniu: `supabase status` + `supabase functions list` jako weryfikacja.

> **Priorytet:** najpierw schema + RLS (pkt 1‑4), następnie Edge Functions (pkt 5‑6), na końcu automatyzacja CLI (pkt 7).
