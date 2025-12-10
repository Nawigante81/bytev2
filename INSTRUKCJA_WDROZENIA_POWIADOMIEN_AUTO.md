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

3. **Wklej zawartość migracji**
   - Otwórz plik: `supabase/migrations/20251210_setup_auto_notifications.sql`
   - Skopiuj całą zawartość
   - Wklej do SQL Editor

4. **Uruchom migrację**
   - Kliknij **Run** (lub Ctrl + Enter)
   - Poczekaj na potwierdzenie sukcesu

5. **Sprawdź wyniki**
   - Powinny pojawić się 2 rezultaty:
     - Lista triggerów (auto_process_notifications)
     - Lista funkcji (trigger_process_pending_notifications)

### Opcja B: Przez Supabase CLI

```bash
# Jeśli masz Supabase CLI zainstalowane
supabase db push

# Lub konkretnie tę migrację
supabase db execute --file supabase/migrations/20251210_setup_auto_notifications.sql
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
   ✅ Funkcja trigger_process_pending_notifications istnieje
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
🎉 Trigger wywołuje edge function automatycznie
```

---

## 🎯 Krok 4: Konfiguracja Service Role Key (opcjonalne)

Jeśli chcesz używać GUC zamiast hardcoded URL:

1. **Otwórz SQL Editor w Supabase Dashboard**

2. **Wykonaj query:**
```sql
ALTER DATABASE postgres SET app.settings = 
'{
  "service_role_key": "twoj_service_role_key_tutaj"
}'::json;
```

3. **Restart connection pool** (może wymagać kilku sekund)

4. **Sprawdź konfigurację:**
```sql
SELECT current_setting('app.settings', true);
```

---

## 🔍 Krok 5: Monitoring i logi

### Gdzie sprawdzać logi:

#### 1. **Postgres Logs** (triggery i błędy bazy)
```
Supabase Dashboard > Logs > Postgres Logs
```

Szukaj:
- ✅ `Triggered process-pending-notifications for [ID]`
- ⚠️ `Edge call failed: [error]`

#### 2. **Edge Functions Logs** (wywołania funkcji)
```
Supabase Dashboard > Edge Functions > 
process-pending-notifications > Logs
```

Sprawdź:
- Czy funkcja jest wywoływana
- Czy przetwarza powiadomienia pomyślnie
- Ewentualne błędy (Resend API, itp.)

#### 3. **Database > Triggers** (weryfikacja triggera)
```
Supabase Dashboard > Database > Triggers
```

Powinien być widoczny: `auto_process_notifications`

---

## 🐛 Troubleshooting

### Problem: Trigger nie wywołuje edge function

**Możliwe przyczyny:**

1. **Rozszerzenie pg_net nie jest włączone**
    ```sql
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    ```

2. **Service Role Key nie jest skonfigurowany**
   - Sprawdź GUC settings
   - Lub ustaw hardcoded w funkcji triggera

3. **Edge function nie jest wdrożona**
   ```bash
   supabase functions deploy process-pending-notifications
   ```

4. **Błąd w net.http_post**
    - Sprawdź Postgres Logs
   - Może być timeout lub błąd sieci

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

### Opcja 2: Database Webhooks (najbardziej stabilne)

1. **Supabase Dashboard > Database > Webhooks**
2. **Create webhook:**
   - Name: `process-pending-notifications`
   - Table: `notifications`
   - Events: `INSERT`
   - Filter: `status = 'pending'`
   - Webhook URL: `https://[project].supabase.co/functions/v1/process-pending-notifications`

3. **Dodaj nagłówki:**
   - Authorization: `Bearer [SERVICE_ROLE_KEY]`

---

## ✅ Checklist weryfikacji

Po wdrożeniu sprawdź:

- [ ] Migracja wykonana bez błędów
- [ ] Trigger `auto_process_notifications` istnieje
- [ ] Funkcja `trigger_process_pending_notifications` istnieje
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
1. Rozważ **Database Webhooks** zamiast triggera
2. Dodaj **Cron backup** (polling co 2-5 min)
3. Skonfiguruj **alerty** dla failed notifications
4. Implementuj **retry logic** w edge function
5. **Monitoruj** regularnie logi i metryki

---

## 📚 Dodatkowe zasoby

- **Dokumentacja optymalizacji:** `OPTYMALIZACJA_AUTO_NOTIFICATIONS.md`
- **Migracja:** `supabase/migrations/20251210_setup_auto_notifications.sql`
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
