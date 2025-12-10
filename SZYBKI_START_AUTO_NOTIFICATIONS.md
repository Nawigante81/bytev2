# ⚡ Szybki start - System automatycznych powiadomień

**Czas: ~5 minut** | **Trudność: Łatwy**

---

## 🚀 Szybkie wdrożenie (3 kroki)

### Krok 1️⃣: Uruchom migrację w Supabase Dashboard

1. Otwórz: [Supabase SQL Editor](https://app.supabase.com/project/wllxicmacmfzmqdnovhp/sql)
2. Kliknij **New Query**
3. Wklej zawartość: `supabase/migrations/20251210_setup_auto_notifications.sql`
4. Kliknij **Run** (Ctrl + Enter)
5. ✅ Gotowe!

### Krok 2️⃣: Zweryfikuj instalację

```bash
node deploy-auto-notifications.js
```

**Powinieneś zobaczyć:**
```
✅ Trigger auto_process_notifications istnieje
✅ Funkcja trigger_process_pending_notifications istnieje
✅ Tabela notifications istnieje i jest dostępna
```

### Krok 3️⃣: Przetestuj system

```bash
node test-auto-notifications.js
```

**Sukces wygląda tak:**
```
✅ System automatycznych powiadomień działa PRAWIDŁOWO
🎉 Trigger wywołuje edge function automatycznie
```

---

## 🎯 Co ten system robi?

**Automatycznie wysyła email** gdy:
1. Dodasz wpis do tabeli `notifications` ze statusem `'pending'`
2. Trigger wykrywa nowy wpis
3. Wywołuje edge function `process-pending-notifications`
4. Email jest wysyłany przez Resend API
5. Status zmienia się na `'sent'` lub `'failed'`

**Bez tego systemu musisz:**
- Ręcznie wywoływać edge function
- Lub używać cron job co X minut
- Lub mieć osobny proces do obsługi kolejki

---

## 📊 Status plików

✅ **GOTOWE:**
- `supabase/migrations/20251210_setup_auto_notifications.sql` - Migracja (zoptymalizowana)
- `deploy-auto-notifications.js` - Skrypt weryfikacji
- `test-auto-notifications.js` - Kompleksowe testy
- `OPTYMALIZACJA_AUTO_NOTIFICATIONS.md` - Dokumentacja techniczna
- `INSTRUKCJA_WDROZENIA_POWIADOMIEN_AUTO.md` - Pełna instrukcja

---

## ⚡ Najczęstsze problemy i rozwiązania

### 🔴 Problem: Migracja nie działa

**Rozwiązanie:**
- Sprawdź czy masz uprawnienia admin
- Użyj Service Role Key
- Uruchom przez Supabase Dashboard (nie CLI)

### 🔴 Problem: Test pokazuje "Trigger NIE istnieje"

**Rozwiązanie:**
```sql
-- W Supabase SQL Editor sprawdź:
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'auto_process_notifications';
```

Jeśli pusty wynik → uruchom migrację ponownie

### 🔴 Problem: "Edge call failed" w logach

**Rozwiązanie:**
1. Sprawdź czy edge function jest wdrożona:
   ```bash
   supabase functions list
   ```

2. Sprawdź URL w migracji (linia 21):
   ```sql
   supabase_url text := 'https://wllxicmacmfzmqdnovhp.supabase.co';
   ```

3. Sprawdź Service Role Key w zmiennych środowiskowych

---

## 🔐 Bezpieczeństwo (optional)

### Ustawienie Service Role Key jako GUC:

```sql
-- W Supabase SQL Editor:
ALTER DATABASE postgres SET app.settings = 
'{"service_role_key": "eyJhbGc...twój_klucz"}';
```

**Kiedy to zrobić:**
- Jeśli nie chcesz hardcode URL w funkcji
- Dla większej elastyczności w różnych środowiskach

**Kiedy pominąć:**
- Development/Staging - hardcode jest OK
- Dla szybkiego prototypowania

---

## 📈 Monitoring

### Gdzie sprawdzać czy działa:

1. **Postgres Logs**: `Supabase Dashboard > Logs > Postgres`
   - Szukaj: "Triggered process-pending-notifications"

2. **Edge Function Logs**: `Dashboard > Edge Functions > process-pending-notifications`
   - Sprawdź wywołania i błędy

3. **Tabela notifications**: Query do bazy
   ```sql
   SELECT * FROM notifications 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## 🚦 Quick Check

Po wdrożeniu sprawdź 3 rzeczy:

```bash
# ✅ 1. Weryfikacja
node deploy-auto-notifications.js

# ✅ 2. Test
node test-auto-notifications.js

# ✅ 3. Logi (manualnie w Dashboard)
```

Jeśli wszystkie 3 pokazują ✅ → **System działa!**

---

## 🎉 Gotowe!

System automatycznych powiadomień jest zainstalowany i testowany.

**Następne kroki:**
- Integruj z aplikacją (dodawaj wpisy do `notifications`)
- Monitoruj logi w Supabase Dashboard
- Dla produkcji: przeczytaj `INSTRUKCJA_WDROZENIA_POWIADOMIEN_AUTO.md`

---

## 🆘 Potrzebujesz pomocy?

1. **Szczegółowa instrukcja:** `INSTRUKCJA_WDROZENIA_POWIADOMIEN_AUTO.md`
2. **Dokumentacja techniczna:** `OPTYMALIZACJA_AUTO_NOTIFICATIONS.md`
3. **Logi:** Supabase Dashboard > Logs

**Tip:** Większość problemów rozwiązuje restart edge function lub ponowne uruchomienie migracji.
