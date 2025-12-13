# 📧 Podsumowanie konfiguracji systemu emailowego

**Data:** 2025-12-10  
**Status:** ✅ Konfiguracja zakończona - wymaga testów

---

## ✅ Wykonane zmiany

### 1. **Zaktualizowano klucz API Resend**
- **Nowy klucz:** `re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA`
- **Lokalizacja:** [`.env:9-10`](.env:9-10)

### 2. **Dodano Service Role Key**
- **Dodano:** `SUPABASE_SERVICE_ROLE_KEY` w [`.env:8`](.env:8)
- **Potrzebne do:** Testowania i wywoływania edge functions lokalnie

### 3. **Zmieniono adres odbiorcy zgłoszeń**
- **Przed:** `admin@byteclinic.pl`
- **Po:** `serwis@byteclinic.pl`
- **Lokalizacja:** [`supabase/functions/notify-system/index.ts:6`](supabase/functions/notify-system/index.ts:6)

### 4. **Zoptymalizowano system automatycznych powiadomień**
- **Funkcja triggera:** Uproszczona i zoptymalizowana
- **Timeout:** Zmniejszony z 5s do 2s
- **Przekazywanie danych:** `notification_id` w body dla lepszego debugowania
- **Lokalizacja:** [`supabase/migrations/20251210_setup_auto_notifications.sql`](supabase/migrations/20251210_setup_auto_notifications.sql)

---

## 📁 Utworzone pliki pomocnicze

| Plik | Opis | Użycie |
|------|------|--------|
| [`diagnoza-email-system.js`](diagnoza-email-system.js) | Skrypt diagnostyczny | `node diagnoza-email-system.js` |
| [`test-auto-notifications.js`](test-auto-notifications.js) | Test systemu powiadomień | `node test-auto-notifications.js` |
| [`deploy-auto-notifications.js`](deploy-auto-notifications.js) | Wdrożenie i weryfikacja | `node deploy-auto-notifications.js` |
| [`update-resend-api-key.ps1`](update-resend-api-key.ps1) | Aktualizacja klucza (Windows) | `.\update-resend-api-key.ps1` |
| [`update-resend-api-key.sh`](update-resend-api-key.sh) | Aktualizacja klucza (Linux/Mac) | `bash update-resend-api-key.sh` |

---

## 📚 Dokumentacja

| Dokument | Przeznaczenie |
|----------|---------------|
| [`AKTUALIZACJA_RESEND_API_KEY.md`](AKTUALIZACJA_RESEND_API_KEY.md) | Instrukcje aktualizacji klucza API |
| [`ZMIANA_ADRESU_EMAIL_SERWIS.md`](ZMIANA_ADRESU_EMAIL_SERWIS.md) | Zmiana adresu odbiorcy zgłoszeń |
| [`BRAK_WYSYLKI_EMAIL_TROUBLESHOOTING.md`](BRAK_WYSYLKI_EMAIL_TROUBLESHOOTING.md) | Rozwiązywanie problemów z wysyłką |
| [`OPTYMALIZACJA_AUTO_NOTIFICATIONS.md`](OPTYMALIZACJA_AUTO_NOTIFICATIONS.md) | Szczegóły optymalizacji systemu |
| [`INSTRUKCJA_WDROZENIA_POWIADOMIEN_AUTO.md`](INSTRUKCJA_WDROZENIA_POWIADOMIEN_AUTO.md) | Pełna instrukcja wdrożenia |
| [`SZYBKI_START_AUTO_NOTIFICATIONS.md`](SZYBKI_START_AUTO_NOTIFICATIONS.md) | Szybki start (5 minut) |

---

## 🚀 Następne kroki (WYMAGANE)

### Krok 1️⃣: Ustaw secrets w Supabase

**Metoda A - Przez CLI:**
```bash
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
```

**Metoda B - Przez Dashboard:**
1. Otwórz: https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions
2. W sekcji "Secrets" dodaj:
   ```
   RESEND_API_KEY = re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA
   MAIL_FROM = onboarding@resend.dev
   ADMIN_EMAIL = serwis@byteclinic.pl
   ```
3. Zapisz i poczekaj 30 sekund (automatyczny restart)

### Krok 2️⃣: Wdróż edge functions

```bash
# Zaloguj się (jeśli jeszcze nie)
supabase login

# Wdróż funkcje
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp
```

### Krok 3️⃣: Uruchom migrację (trigger)

1. Otwórz: https://app.supabase.com/project/wllxicmacmfzmqdnovhp/sql
2. Kliknij "New Query"
3. Wklej zawartość: [`supabase/migrations/20251210_setup_auto_notifications.sql`](supabase/migrations/20251210_setup_auto_notifications.sql)
4. Kliknij "Run" (Ctrl+Enter)

### Krok 4️⃣: Przetestuj system

**Test automatyczny:**
```bash
node diagnoza-email-system.js
```

**Test powiadomień:**
```bash
node test-auto-notifications.js
```

**Test manualny:**
1. Otwórz: https://byteclinic.pl/kontakt
2. Wypełnij formularz
3. Wyślij
4. Sprawdź:
   - Email potwierdzenia do klienta ✅
   - Email kopii na `serwis@byteclinic.pl` ✅
   - Logi w Resend Dashboard ✅

---

## 🔍 Weryfikacja konfiguracji

### Sprawdź zmienne środowiskowe (.env)

```bash
cat .env
```

**Powinny być:**
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (nowy!)
- ✅ `VITE_EMAIL_API_KEY`
- ✅ `RESEND_API_KEY`

### Sprawdź Supabase Secrets

```bash
supabase secrets list --project-ref wllxicmacmfzmqdnovhp
```

**Powinny być:**
- ✅ `RESEND_API_KEY`
- ✅ `MAIL_FROM`
- ✅ `ADMIN_EMAIL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (automatycznie)
- ✅ `SUPABASE_URL` (automatycznie)

### Sprawdź edge functions

```bash
supabase functions list --project-ref wllxicmacmfzmqdnovhp
```

**Powinny być wdrożone:**
- ✅ `notify-system`
- ✅ `process-pending-notifications`
- ✅ `send-email-resend`

---

## 📊 Architektura systemu emailowego

```
┌─────────────────┐
│ Formularz       │
│ kontaktowy      │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ 1. Zapis do tabeli requests  │
│    (źródło: formularz)        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 2. Edge Function:            │
│    notify-system             │
│    - Tworzy powiadomienia    │
│    - Klient: potwierdzenie   │
│    - Admin: kopia zgłoszenia │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 3. Tabela notifications      │
│    Status: 'pending'          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 4. Trigger (auto)            │
│    auto_process_notifications│
│    - Wykrywa nowe 'pending'  │
│    - Wywołuje edge function  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 5. Edge Function:            │
│    process-pending-notif.    │
│    - Wysyła przez Resend API │
│    - Status → 'sent'/'failed'│
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 6. Resend API                │
│    - Dostarcza email         │
│    - Loguje w Dashboard      │
└──────────────────────────────┘
```

---

## 🎯 Adresy email w systemie

| Cel | Adres | Konfiguracja |
|-----|-------|--------------|
| **Publiczny kontakt** | `kontakt@byteclinic.pl` | Widoczny na stronie |
| **Odbiorca zgłoszeń** | `serwis@byteclinic.pl` | `ADMIN_EMAIL` w Secrets |
| **Nadawca emaili** | `onboarding@resend.dev` | `MAIL_FROM` w Secrets |

**Uwaga:** Po weryfikacji domeny `byteclinic.pl` w Resend, zmień `MAIL_FROM` na `noreply@byteclinic.pl`

---

## ⚠️ Znane problemy i rozwiązania

### Problem: Brak logów w Resend
**Przyczyna:** `RESEND_API_KEY` nie jest ustawiony w Supabase Secrets  
**Rozwiązanie:** Patrz Krok 1️⃣ powyżej

### Problem: Powiadomienia mają status 'pending' i nie zmieniają się
**Przyczyna:** Trigger nie działa lub edge function ma błąd  
**Rozwiązanie:** 
1. Sprawdź czy trigger istnieje (Krok 3️⃣)
2. Sprawdź logi: https://app.supabase.com/project/wllxicmacmfzmqdnovhp/logs
3. Uruchom `node diagnoza-email-system.js`

### Problem: "Email sent" ale nie dotarł
**Przyczyna:** Domena nie jest zweryfikowana lub email w spamie  
**Rozwiązanie:** 
1. Zweryfikuj domenę w Resend Dashboard
2. Sprawdź folder spam
3. Użyj tymczasowo `onboarding@resend.dev`

---

## 📞 Testowanie

### Test 1: Diagnostyka
```bash
node diagnoza-email-system.js
```

### Test 2: System powiadomień
```bash
node test-auto-notifications.js
```

### Test 3: Formularz kontaktowy
1. https://byteclinic.pl/kontakt
2. Wypełnij i wyślij
3. Sprawdź `serwis@byteclinic.pl`

---

## ✅ Checklist końcowy

- [ ] Secrets ustawione w Supabase
- [ ] Edge functions wdrożone
- [ ] Migracja (trigger) uruchomiona
- [ ] Test diagnostyczny przeszedł (node diagnoza-email-system.js)
- [ ] Test powiadomień przeszedł (node test-auto-notifications.js)
- [ ] Formularz kontaktowy wysyła emaile
- [ ] Email dociera na serwis@byteclinic.pl
- [ ] Logi widoczne w Resend Dashboard

---

**Status:** Konfiguracja gotowa do wdrożenia. Wykonaj kroki 1-4 i przetestuj!
