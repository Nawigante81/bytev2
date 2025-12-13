# 🚀 Instrukcja wdrożenia systemu automatycznych powiadomień

**Status:** ✅ Gotowe do wdrożenia  
**Data:** 2025-12-10  
**Czas wdrożenia:** ~10 minut

---

## 📋 Wymagania wstępne

Przed wdrożeniem upewnij się, że:

- ✅ Tabela `notifications` istnieje w bazie danych
- ✅ Edge function `process-pending-notifications` jest wdrożona
- ✅ Masz dostęp do Supabase Dashboard
- ✅ Zmienne środowiskowe są skonfigurowane:
  - `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🎯 Krok 1: Uruchom migrację

### Opcja A: Przez Supabase Dashboard (ZALECANE)

1. **Otwórz Supabase Dashboard**
   ```
   https://app.supabase.com/project/wllxicmacmfzmqdnovhp
   ```

2. **Przejdź do SQL Editor**
   - W menu bocznym kliknij **SQL Editor**
   - Kliknij **New Query**

3. **Wklej zawartość odpowiedniej migracji**
   - ✅ **Development / Staging:** `supabase/migrations/20251210_setup_auto_notifications.sql`
   - 🟢 **Production (Database Webhook, plan Pro):** `supabase/migrations/20251210_enable_notifications_webhook.sql`
   - Upewnij się, że w wersji produkcyjnej masz aktywne Database Webhooks w projekcie Supabase

4. **Uruchom migrację**
   - Kliknij **Run** (lub Ctrl + Enter)
   - Poczekaj na potwierdzenie sukcesu

5. **Sprawdź wyniki**
   - Dla wersji triggerowej:
     - Lista triggerów (auto_process_notifications)
     - Lista funkcji (trigger_process_pending_notifications)
   - Dla Database Webhook:
     - Funkcja `notifications_webhook_dispatch`
     - Trigger `auto_process_notifications` (ten sam, ale wskazuje nową funkcję)

### Opcja B: Przez Supabase CLI

```bash
# Jeśli masz Supabase CLI zainstalowane
supabase db push

# Lub konkretną migrację (wybierz odpowiednią)
# DEV/Staging
supabase db execute --file supabase/migrations/20251210_setup_auto_notifications.sql

# Production (Database Webhook)
supabase db execute --file supabase/migrations/20251210_enable_notifications_webhook.sql
```

---

## 🎯 Krok 2: Weryfikuj instalację

Uruchom skrypt weryfikacyjny:

```bash
node deploy-auto-notifications.js
```

**Oczekiwany output:**
```
🚀 Wdrażanie systemu automatycznych powiadomień...

📄 Wczytywanie migracji...
✅ Migracja wczytana
🔍 Sprawdzanie stanu systemu...
   ✅ Trigger auto_process_notifications istnieje
   ✅ Funkcja trigger_process_pending_notifications (DEV) **lub** notifications_webhook_dispatch (PROD) istnieje
   ✅ Tabela notifications istnieje i jest dostępna


✨ Gotowe!
```

---

## 🎯 Krok 3: Przetestuj system

Uruchom testy automatyczne:

```bash
node test-auto-notifications.js
```

**Test sprawdzi:**
1. ✅ Czy trigger został utworzony
2. ✅ Czy można wstawić powiadomienie
3. ✅ Czy powiadomienie zostaje przetworzone automatycznie
4. ✅ Czy edge function jest wywoływana

**Oczekiwany pozytywny wynik:**
```
✅ System automatycznych powiadomień działa PRAWIDŁOWO
🎉 Trigger/Database Webhook wywołuje edge function automatycznie
```

---

## 🎯 Krok 4: Konfiguracja `app.settings` (wymagane dla Database Webhook)

Database Webhook używa `supabase_functions.http_request`, więc klucz Service Role zostaje pobrany z `app.settings`. Umieść tam **zarówno SRK jak i URL projektu**.

1. **Otwórz SQL Editor w Supabase Dashboard**

2. **Wykonaj query:**
```sql
ALTER DATABASE postgres SET app.settings =
'{
  "service_role_key": "twoj_service_role_key_tutaj",
  "supabase_url": "https://twoj-projekt.supabase.co"
}'::json;
```

3. **Restart connection pool** (Settings > Database > Restart)

4. **Sprawdź konfigurację:**
```sql
SELECT current_setting('app.settings', true);
```

---

## 🔍 Krok 5: Monitoring i logi

### Gdzie sprawdzać logi:

#### 1. **Postgres Logs** (triggery / supabase_functions.http_request)
```
Supabase Dashboard > Logs > Postgres Logs
```

Szukaj:
- ✅ `auto_process_notifications` + `notifications_webhook_dispatch`
- ⚠️ Ostrzeżeń `supabase_functions.http_request` lub `Service Role Key...`

#### 2. **Database Webhooks Logs**
```
Supabase Dashboard > Database > Webhooks > process-pending-notifications
```

Sprawdź:
- Czy każde `INSERT` ma status `200`
- Payload (record, status) oraz ewentualne błędy autoryzacji

#### 3. **Edge Functions Logs** (wywołania funkcji)
```
Supabase Dashboard > Edge Functions >
process-pending-notifications > Logs
```

Sprawdź:
- Czy funkcja jest wywoływana
- Czy przetwarza powiadomienia pomyślnie
- Ewentualne błędy (Resend API, itp.)

#### 4. **Database > Triggers/Webhooks** (weryfikacja obiektu)
```
Supabase Dashboard > Database > Triggers
```

Powinien być widoczny: `auto_process_notifications` wskazujący na `notifications_webhook_dispatch`

---

## 🐛 Troubleshooting

### Problem: Trigger/Webhook nie wywołuje edge function

**Możliwe przyczyny:**

1. **Rozszerzenie pg_net nie jest włączone**
    ```sql
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    ```

2. **Service Role Key lub supabase_url nie są skonfigurowane w `app.settings`**
   - `SELECT current_setting('app.settings', true);`
   - Ustaw wartości jak w Kroku 4

3. **Edge function nie jest wdrożona**
   ```bash
   supabase functions deploy process-pending-notifications
   ```

4. **Błąd `supabase_functions.http_request`**
    - Sprawdź Postgres Logs + Database Webhooks Logs
    - Zweryfikuj nagłówki Authorization / timeout 5s

### Problem: Powiadomienia mają status 'pending'

**Sprawdź:**

1. **Logi Edge Function** - czy funkcja jest wywoływana?
2. **Resend API** - czy key jest poprawny?
3. **Retry**: Uruchom manualnie
   ```bash
   node test-auto-notifications.js
   ```

### Problem: "Edge call failed" w logach

**Możliwe przyczyny:**

1. **Timeout (2000ms)**
   - Edge function trwa za długo
   - Zwiększ timeout w funkcji triggera

2. **URL niepoprawny**
   - Sprawdź czy URL Supabase jest poprawny
   - Format: `https://[project].supabase.co`

3. **Network issue**
   - extensions.http może być niestabilny
   - Rozważ Database Webhooks jako alternatywę

---

## 🔄 Alternatywne rozwiązania

### Opcja 1: Dodaj Cron Backup

Jeśli trigger czasem się zawiesza:

1. Odkomentuj sekcję cron w migracji:
```sql
-- Znajdź w pliku 20251210_setup_auto_notifications.sql
-- Usuń '--' z linii 82-105
```

2. Uruchom ponownie migrację

3. Cron będzie przetwarzał pending co 5 minut jako backup

### Opcja 2: Database Webhooks (najbardziej stabilne) — PRODUKCJA

- Uruchom migrację: `supabase/migrations/20251210_enable_notifications_webhook.sql`
- Zweryfikuj w Dashboardzie (Database > Webhooks), że webhook `process-pending-notifications` jest WŁ.
- Jeśli potrzebujesz stworzyć webhook ręcznie (fallback):
  1. **Supabase Dashboard > Database > Webhooks > Create**
  2. Ustaw: Name `process-pending-notifications`, Table `notifications`, Events `INSERT`, Filter `status = 'pending'`, URL projektu
  3. Dodaj nagłówki: `Authorization: Bearer [SERVICE_ROLE_KEY]`, `Content-Type: application/json`


---

## ✅ Checklist weryfikacji

Po wdrożeniu sprawdź:

- [ ] Migracja wykonana bez błędów
- [ ] Trigger `auto_process_notifications` istnieje (wskazuje na właściwą funkcję)
- [ ] Funkcja `trigger_process_pending_notifications` (DEV) lub `notifications_webhook_dispatch` (PROD) istnieje
- [ ] Tabela `notifications` jest dostępna
- [ ] Edge function jest wdrożona
- [ ] Test `test-auto-notifications.js` przeszedł pomyślnie
- [ ] Logi w Supabase Dashboard pokazują wywołania
- [ ] Testowe powiadomienie zostało wysłane

---

## 📊 Co dalej?

### Dla development:
✅ System jest gotowy - możesz używać

### Dla production:
1. **Wymagane:** uruchom `20251210_enable_notifications_webhook.sql` (Database Webhook)
2. Dodaj **Cron backup** (polling co 2-5 min) jako fallback
3. Skonfiguruj **alerty** dla failed notifications + webhook errors
4. Implementuj **retry logic** w edge function
5. **Monitoruj** regularnie logi i metryki (Postgres + Database Webhooks)

---

## 📚 Dodatkowe zasoby

- **Dokumentacja optymalizacji:** `OPTYMALIZACJA_AUTO_NOTIFICATIONS.md`
- **Migracje:**
  - `supabase/migrations/20251210_setup_auto_notifications.sql` (DEV)
  - `supabase/migrations/20251210_enable_notifications_webhook.sql` (PROD)
- **Skrypt wdrożenia:** `deploy-auto-notifications.js`
- **Skrypt testowy:** `test-auto-notifications.js`

---

## 🆘 Wsparcie

Jeśli napotkasz problemy:

1. **Sprawdź logi** w Supabase Dashboard
2. **Uruchom testy** ponownie: `node test-auto-notifications.js`
3. **Przeczytaj dokumentację** optymalizacji
4. **Rozważ alternatywy** (webhooks, cron)

---

**Status:** ✅ Gotowe do produkcji (z uwzględnieniem zaleceń)
