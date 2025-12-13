# 🔍 JAK SPRAWDZIĆ CZY FRONTEND TRAFIA DO API

## ⚡ NAJSZYBSZA METODA - Przeglądarka

### Krok 1: Otwórz test-contact-api.html

Kliknij dwukrotnie na plik `test-contact-api.html` - otworzy się w przeglądarce.

### Krok 2: Otwórz DevTools

Naciśnij **F12** lub kliknij prawym → **Zbadaj element**

### Krok 3: Przejdź do zakładki Network

W DevTools kliknij zakładkę **Network** (Sieć)

### Krok 4: Wyślij testowe zgłoszenie

Kliknij przycisk **"🚀 Wyślij testowe zgłoszenie"**

### Krok 5: Sprawdź request

W zakładce Network pojawi się request. Kliknij na niego i sprawdź:

#### ✅ Request URL
```
https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-new-diagnosis
```

**Czy URL jest poprawny?**
- TAK → Frontend trafia do właściwego endpointu ✅
- NIE → Sprawdź konfigurację w `src/services/emailService.js`

#### ✅ Method
```
POST
```

**Czy metoda to POST?**
- POST → Właściwy request ✅
- OPTIONS → To preflight CORS (normalny), poczekaj na POST
- GET → Błąd w kodzie frontendu ❌

#### ✅ Status Code

**Co pokazuje status?**
- **200** → ✅ **SUKCES! API działa!**
- **404** → ❌ Endpoint nie istnieje (brak Edge Function)
- **403** → ❌ Brak autoryzacji (błędny API key lub CORS)
- **500** → ❌ Błąd w Edge Function (sprawdź logi)

#### ✅ Request Headers

Kliknij na request → zakładka **Headers** → **Request Headers**

**Sprawdź czy są:**
```
Authorization: Bearer eyJhbGci...
Content-Type: application/json
apikey: eyJhbGci...
```

**Czy wszystkie nagłówki są?**
- TAK → Konfiguracja OK ✅
- NIE → Problem w `src/services/emailService.js`

#### ✅ Response

Kliknij na request → zakładka **Response**

**Co pokazuje response?**
- JSON z `success: true` → ✅ Wszystko działa!
- JSON z błędem → Zobacz szczegóły błędu
- HTML → Błąd Supabase (sprawdź logi)
- Pusty → Timeout lub brak odpowiedzi

---

## 🔴 CO ROBIĆ GDY...

### Status 404 - Endpoint nie istnieje

**Problem:** Edge Function nie jest wdrożona w Supabase

**Rozwiązanie:**

1. Sprawdź czy funkcja istnieje lokalnie:
   ```bash
   ls supabase/functions/
   ```

2. Wdróż funkcję:
   ```bash
   supabase functions deploy notify-new-diagnosis
   ```

3. Lub sprawdź w Supabase Dashboard:
   - Otwórz https://supabase.com/dashboard
   - Wybierz projekt
   - Edge Functions → Zobacz czy `notify-new-diagnosis` jest wdrożona

---

### Status 403 - Brak autoryzacji

**Problem 1:** Błędny API key

**Rozwiązanie:**
1. Otwórz `.env`
2. Sprawdź `VITE_SUPABASE_ANON_KEY`
3. Porównaj z Supabase Dashboard → Settings → API → anon public key
4. Jeśli różne - skopiuj właściwy klucz do `.env`
5. Zrestartuj dev server: `npm run dev`

**Problem 2:** Brak CORS

**Rozwiązanie:**
1. Otwórz Supabase Dashboard → API → CORS
2. Dodaj domeny:
   ```
   https://byteclinic.pl
   https://www.byteclinic.pl
   http://localhost:5173
   ```
3. Zapisz

---

### Status 500 - Błąd serwera

**Problem:** Edge Function ma błąd w kodzie

**Rozwiązanie:**
1. Otwórz Supabase Dashboard → Edge Functions
2. Kliknij na `notify-new-diagnosis`
3. Przejdź do zakładki **Logs**
4. Zobacz szczegóły błędu
5. Napraw kod w `supabase/functions/notify-new-diagnosis/index.ts`
6. Wdróż ponownie: `supabase functions deploy notify-new-diagnosis`

**Typowe błędy:**
- Brak `RESEND_API_KEY` w zmiennych środowiskowych
- Syntax error w kodzie
- Timeout (funkcja działa za długo)

---

### Błąd CORS w Console

**Komunikat w Console:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Rozwiązanie:**
1. Supabase Dashboard → API → CORS
2. Dodaj origin aplikacji (np. `http://localhost:5173`)
3. Sprawdź czy Edge Function zwraca nagłówki CORS

---

## 📊 PRZYKŁAD POPRAWNEGO REQUESTU

```
✅ Request URL: 
https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-new-diagnosis

✅ Method: POST

✅ Status: 200 OK

✅ Request Headers:
Authorization: Bearer eyJhbGci...
Content-Type: application/json
apikey: eyJhbGci...

✅ Request Payload:
{
  "to": "test@example.com",
  "subject": "Nowe zgłoszenie",
  "data": {
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "message": "Potrzebuję naprawy"
  }
}

✅ Response:
{
  "success": true,
  "messageId": "abc123"
}
```

---

## 📊 PRZYKŁAD BŁĘDNEGO REQUESTU (404)

```
❌ Request URL: 
https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/send-contact

❌ Method: POST

❌ Status: 404 Not Found

❌ Response:
{
  "error": "Function not found"
}
```

**Diagnoza:** Endpoint `/functions/v1/send-contact` nie istnieje

**Rozwiązanie:** 
- Zmień endpoint na `notify-new-diagnosis` w kodzie
- LUB wdróż funkcję `send-contact`

---

## 🎯 CHECKLIST

Po wykonaniu testu zaznacz:

- [ ] Otworzyłem test-contact-api.html
- [ ] Otworzyłem DevTools (F12)
- [ ] Przeszedłem do zakładki Network
- [ ] Wysłałem testowe zgłoszenie
- [ ] Sprawdziłem Request URL
- [ ] Sprawdziłem Method (POST)
- [ ] Sprawdziłem Status Code
- [ ] Sprawdziłem Request Headers
- [ ] Sprawdziłem Response
- [ ] Sprawdziłem Console na błędy

---

## 📞 CO DALEJ?

Po wykonaniu testu będziesz wiedział:

### Jeśli Status 200 ✅
**Frontend trafia do API i API działa!**

Problem może być w:
- Wysyłce emaila (sprawdź RESEND_API_KEY)
- Konfiguracji email template
- Docelowym adresie email

### Jeśli Status 404 ❌
**Frontend trafia do API, ale endpoint nie istnieje**

Musisz:
- Wdrożyć Edge Function w Supabase
- LUB zmienić endpoint w kodzie frontendu

### Jeśli Status 403 ❌
**Frontend trafia do API, ale brak autoryzacji**

Musisz:
- Sprawdzić API key w `.env`
- Dodać CORS w Supabase

### Jeśli Status 500 ❌
**Frontend trafia do API, ale funkcja ma błąd**

Musisz:
- Sprawdzić logi w Supabase Dashboard
- Naprawić kod Edge Function

---

## 🚀 NASTĘPNE KROKI

1. **Wykonaj test** używając `test-contact-api.html`
2. **Zanotuj wyniki** (Status Code, Response)
3. **Postępuj według instrukcji** dla danego statusu
4. **Sprawdź ponownie** po naprawie

---

**Pełna dokumentacja:** `INSTRUKCJA_TESTOWANIA_API.md`  
**Szybki start:** `SZYBKI_TEST_API.md`
