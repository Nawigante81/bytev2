# 🔑 Aktualizacja klucza API Resend

**Data:** 2025-12-10  
**Status:** ✅ Zaktualizowano lokalnie - wymaga aktualizacji w Supabase  
**Nowy klucz:** `<RESEND_API_KEY>`

---

## ✅ Co zostało zrobione

### 1. Plik `.env` zaktualizowany
```env
RESEND_API_KEY=<RESEND_API_KEY>
```

### 2. Utworzone skrypty pomocnicze
- ✅ `update-resend-api-key.sh` (Linux/Mac)
- ✅ `update-resend-api-key.ps1` (Windows PowerShell)

---

## 🚨 WAŻNE: Wymagane kroki w Supabase

Edge functions w Supabase odczytują klucz API ze **Supabase Secrets**, nie z pliku `.env`.  
**Musisz zaktualizować secret w Supabase Dashboard!**

---

## 📋 Krok po kroku - Aktualizacja w Supabase

### Opcja A: Przez Supabase Dashboard (ZALECANE)

1. **Otwórz Dashboard Functions Settings:**
   ```
   https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions
   ```

2. **W sekcji "Secrets" znajdź lub dodaj:**
   ```
   RESEND_API_KEY
   ```

3. **Zaktualizuj wartość na:**
   ```
   <RESEND_API_KEY>
   ```

4. **Kliknij "Save" lub "Update"**

5. **Edge functions automatycznie się zrestartują** (może zająć ~10-30 sekund)

### Opcja B: Przez Supabase CLI

```bash
# 1. Zaloguj się (jeśli jeszcze nie)
supabase login

# 2. Ustaw secret
supabase secrets set RESEND_API_KEY=<RESEND_API_KEY> --project-ref wllxicmacmfzmqdnovhp

# 3. Sprawdź czy został ustawiony
supabase secrets list --project-ref wllxicmacmfzmqdnovhp
```

### Opcja C: Użyj pomocniczych skryptów

**Windows:**
```powershell
.\update-resend-api-key.ps1
```

**Linux/Mac:**
```bash
bash update-resend-api-key.sh
```

---

## 🧪 Weryfikacja po aktualizacji

### 1. Sprawdź czy secret został ustawiony

W Supabase Dashboard:
```
Settings > Edge Functions > Secrets
```

Powinieneś zobaczyć:
- ✅ `RESEND_API_KEY` = `re_Gnup...`

### 2. Przetestuj wysyłanie emaili

Uruchom test:
```bash
node test-auto-notifications.js
```

**Oczekiwany rezultat:**
```
✅ Email sent successfully
✅ System automatycznych powiadomień działa PRAWIDŁOWO
```

### 3. Sprawdź logi Edge Functions

```
Supabase Dashboard > Edge Functions > process-pending-notifications > Logs
```

Szukaj:
- ✅ Brak błędów "Invalid API key"
- ✅ Pomyślne wywołania Resend API
- ✅ Status: 200 OK

---

## 📊 Edge Functions używające Resend API

Następujące funkcje używają `RESEND_API_KEY`:

1. **`process-pending-notifications`**
   - Automatyczne przetwarzanie kolejki powiadomień
   - Wywoływana przez trigger lub manualnie

2. **`send-email-resend`**
   - Bezpośrednie wysyłanie emaili
   - Używana jako backup/alternatywa

3. **`notify-new-diagnosis`** (jeśli istnieje)
   - Powiadomienia o nowych diagnozach

4. **`notify-repair-status-change`** (jeśli istnieje)
   - Powiadomienia o zmianach statusu napraw

**Wszystkie te funkcje będą używać nowego klucza po aktualizacji secrets.**

---

## ⚠️ Typowe problemy

### Problem: "Invalid API key" w logach

**Przyczyna:**
- Secret nie został zaktualizowany w Supabase
- Edge functions używają starego klucza

**Rozwiązanie:**
1. Sprawdź czy secret jest ustawiony w Dashboard
2. Odczekaj 30 sekund na restart funkcji
3. Uruchom test ponownie

### Problem: Edge functions nie restartują się

**Rozwiązanie:**
1. W Dashboard przejdź do każdej funkcji
2. Kliknij "Redeploy" lub zaktualizuj kod (nawet kosmetycznie)
3. Alternatywnie: użyj CLI `supabase functions deploy <nazwa>`

### Problem: Test pokazuje błąd po aktualizacji

**Sprawdź:**
1. Czy nowy klucz API jest aktywny w Resend Dashboard
2. Czy domena `byteclinic.pl` jest zweryfikowana w Resend
3. Czy limit wysyłek nie został przekroczony

---

## 🔐 Opcjonalne: Dodatkowe secrets

Podczas gdy jesteś w Supabase Secrets, możesz też zaktualizować:

```bash
# Email nadawcy
supabase secrets set MAIL_FROM=noreply@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp

# Email administratora (do powiadomień błędów)
supabase secrets set ADMIN_EMAIL=admin@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
```

Lub w Dashboard:
```
MAIL_FROM = noreply@byteclinic.pl
ADMIN_EMAIL = admin@byteclinic.pl
```

---

## ✅ Checklist

Po zaktualizowaniu klucza API, sprawdź:

- [ ] Secret `RESEND_API_KEY` zaktualizowany w Supabase Dashboard
- [ ] Edge functions zrestartowały się (odczekaj 30 sek)
- [ ] Test `node test-auto-notifications.js` przeszedł pomyślnie
- [ ] Logi Edge Functions nie pokazują błędów API key
- [ ] Testowy email został wysłany poprawnie
- [ ] (Opcjonalnie) `MAIL_FROM` i `ADMIN_EMAIL` zaktualizowane

---

## 📚 Dodatkowe zasoby

- **Resend Dashboard:** https://resend.com/api-keys
- **Supabase Secrets Docs:** https://supabase.com/docs/guides/functions/secrets
- **Test powiadomień:** `test-auto-notifications.js`
- **Dokumentacja systemu:** `SZYBKI_START_AUTO_NOTIFICATIONS.md`

---

## 🆘 Wsparcie

Jeśli napotkasz problemy:

1. Sprawdź logi w Supabase Dashboard
2. Zweryfikuj klucz w Resend Dashboard (czy jest aktywny)
3. Uruchom test ponownie: `node test-auto-notifications.js`
4. Sprawdź czy domena jest zweryfikowana w Resend

---

**Następny krok:** Zaktualizuj secret w Supabase Dashboard i przetestuj system!
