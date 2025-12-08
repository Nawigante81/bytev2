# 🔍 Instrukcja Testowania API Kontaktowego

## Problem
Formularz kontaktowy nie wysyła zgłoszeń - trzeba sprawdzić czy frontend w ogóle trafia do API.

## Metody Testowania

### 1. Test w Przeglądarce (ZALECANE)

**Krok 1:** Otwórz plik `test-contact-api.html` w przeglądarce

**Krok 2:** Otwórz DevTools (F12) → zakładka **Network**

**Krok 3:** Kliknij przycisk "🚀 Wyślij testowe zgłoszenie"

**Krok 4:** Sprawdź w zakładce Network:

#### ✅ Co sprawdzić:

1. **Request URL** - czy to właściwy endpoint?
   ```
   https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-new-diagnosis
   ```

2. **Method** - czy to POST (nie OPTIONS)?
   - POST = właściwy request
   - OPTIONS = preflight CORS request (normalny)

3. **Status Code** - co zwraca serwer?
   - `200` = ✅ Sukces
   - `404` = ❌ Endpoint nie istnieje
   - `403` = ❌ Brak autoryzacji / błędny API key
   - `500` = ❌ Błąd w Edge Function

4. **Request Headers** - czy są wszystkie wymagane?
   ```
   Authorization: Bearer eyJhbGci...
   Content-Type: application/json
   apikey: eyJhbGci...
   ```

5. **Response** - co zwraca backend?
   - Kliknij na request → zakładka **Response**
   - Zobacz czy jest JSON czy tekst błędu

### 2. Test z Terminala (Windows)

**Uruchom:** `test-contact-api.bat`

Ten skrypt przetestuje 4 różne endpointy:
- notify-new-diagnosis
- send-contact
- contact
- notify-system

### 3. Test na Produkcji

**Krok 1:** Otwórz https://byteclinic.pl/kontakt

**Krok 2:** Otwórz DevTools (F12) → Network

**Krok 3:** Wypełnij formularz i kliknij "Wyślij zgłoszenie"

**Krok 4:** Sprawdź request w Network (jak w punkcie 1)

---

## 🔴 Najczęstsze Błędy

### Błąd 404 - Endpoint nie istnieje

**Przyczyna:** Edge Function nie jest wdrożona w Supabase

**Rozwiązanie:**
```bash
# Sprawdź czy funkcje istnieją lokalnie
ls supabase/functions/

# Wdróż funkcje do Supabase
supabase functions deploy notify-new-diagnosis
supabase functions deploy send-contact
```

**Alternatywa:** Sprawdź w Supabase Dashboard → Edge Functions czy funkcje są wdrożone

---

### Błąd 403 - Brak autoryzacji

**Przyczyna 1:** Błędny API key

**Rozwiązanie:**
1. Sprawdź `.env`:
   ```
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
2. Porównaj z Supabase Dashboard → Settings → API → anon public key

**Przyczyna 2:** Brak CORS

**Rozwiązanie:**
1. Otwórz Supabase Dashboard → API → CORS
2. Dodaj domeny:
   ```
   https://byteclinic.pl
   https://www.byteclinic.pl
   http://localhost:5173
   ```

---

### Błąd 500 - Błąd serwera

**Przyczyna:** Edge Function ma błąd w kodzie

**Rozwiązanie:**
1. Otwórz Supabase Dashboard → Edge Functions
2. Kliknij na funkcję → **Logs**
3. Zobacz szczegóły błędu
4. Napraw kod funkcji i wdróż ponownie

**Typowe błędy w Edge Function:**
- Brak zmiennych środowiskowych (RESEND_API_KEY)
- Błąd w kodzie (syntax error)
- Timeout (funkcja działa za długo)

---

### Błąd CORS w konsoli

**Komunikat:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Rozwiązanie:**
1. Supabase Dashboard → API → CORS
2. Dodaj origin aplikacji
3. Sprawdź czy Edge Function zwraca nagłówki CORS:
   ```javascript
   return new Response(JSON.stringify(data), {
     headers: {
       'Content-Type': 'application/json',
       'Access-Control-Allow-Origin': '*'
     }
   })
   ```

---

## 📊 Analiza Requestu z DevTools

### Przykład POPRAWNEGO requestu:

```
Request URL: https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-new-diagnosis
Request Method: POST
Status Code: 200 OK

Request Headers:
  Authorization: Bearer eyJhbGci...
  Content-Type: application/json
  apikey: eyJhbGci...

Request Payload:
{
  "to": "test@example.com",
  "subject": "Nowe zgłoszenie",
  "data": {
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "message": "Potrzebuję naprawy laptopa"
  }
}

Response:
{
  "success": true,
  "messageId": "abc123"
}
```

### Przykład BŁĘDNEGO requestu (404):

```
Request URL: https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/send-contact
Request Method: POST
Status Code: 404 Not Found

Response:
{
  "error": "Function not found"
}
```

**Diagnoza:** Endpoint `/functions/v1/send-contact` nie istnieje.
**Rozwiązanie:** Zmień endpoint na istniejący lub wdróż brakującą funkcję.

---

## 🛠️ Debugowanie Krok po Kroku

### 1. Sprawdź konfigurację frontendu

**Plik:** `src/services/emailService.js`

**Linia 1137-1148:**
```javascript
getFunctionNameForTemplate(template) {
  const functionMap = {
    'bookingConfirmation': 'notify-booking-confirmation',
    'repairStatusUpdate': 'notify-repair-status',
    'repairReady': 'notify-repair-ready',
    'appointmentReminder': 'notify-appointment-reminder',
    'emailConfirmation': 'notify-email-confirmation',
    'repairRequest': 'notify-new-diagnosis'  // ← To jest używane dla Contact
  };
  
  return functionMap[template] || 'notify-general';
}
```

**Sprawdź:** Czy `repairRequest` mapuje na właściwy endpoint?

### 2. Sprawdź wywołanie w Contact.jsx

**Plik:** `src/pages/Contact.jsx`

**Linia 172:**
```javascript
await emailService.sendRepairRequest(emailData);
```

**Linia 1151-1153 w emailService.js:**
```javascript
async sendRepairRequest(repairData) {
  return this.sendEmail(repairData.email || 'admin@byteclinic.pl', 'repairRequest', repairData);
}
```

**Sprawdź:** Czy `repairRequest` to właściwy template?

### 3. Sprawdź finalny request

**Plik:** `src/services/emailService.js`

**Linia 1057-1082:**
```javascript
async sendWithSupabase(to, emailContent, template, data) {
  const functionName = this.getFunctionNameForTemplate(template);
  
  const response = await fetch(`${this.config.supabase.url}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.config.supabase.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      data: data,
      metadata: { ... }
    })
  });
}
```

**Finalny URL:** `https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-new-diagnosis`

---

## ✅ Checklist Diagnostyczny

- [ ] Sprawdziłem Request URL w DevTools Network
- [ ] Sprawdziłem Method (POST nie OPTIONS)
- [ ] Sprawdziłem Status Code
- [ ] Sprawdziłem Request Headers (Authorization, apikey)
- [ ] Sprawdziłem Request Payload
- [ ] Sprawdziłem Response
- [ ] Sprawdziłem Console na błędy CORS
- [ ] Sprawdziłem czy Edge Function jest wdrożona w Supabase
- [ ] Sprawdziłem logi Edge Function w Supabase Dashboard
- [ ] Sprawdziłem CORS w Supabase Dashboard

---

## 📞 Co dalej?

Po przeprowadzeniu testów będziesz wiedział:

1. **Czy frontend trafia do API?**
   - TAK → Problem jest w Edge Function
   - NIE → Problem jest w konfiguracji frontendu

2. **Jaki jest status code?**
   - 404 → Brak Edge Function
   - 403 → Problem z autoryzacją/CORS
   - 500 → Błąd w kodzie Edge Function
   - 200 → API działa, problem gdzie indziej

3. **Co pokazuje Response?**
   - Błąd JSON → Szczegóły problemu
   - HTML → Prawdopodobnie błąd Supabase
   - Pusty → Timeout lub brak odpowiedzi

---

## 🚀 Następne Kroki

Po zdiagnozowaniu problemu:

1. **Jeśli 404:** Wdróż Edge Functions
2. **Jeśli 403:** Napraw CORS i API key
3. **Jeśli 500:** Sprawdź logi i napraw kod
4. **Jeśli 200:** Sprawdź czy email faktycznie się wysyła

---

**Autor:** ByteClinic Development Team  
**Data:** 2025-01-05  
**Wersja:** 1.0
