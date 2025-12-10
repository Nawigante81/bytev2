# Raport: Analiza błędnych zapytań do Resend API

**Data:** 2025-12-10  
**Status:** 🔍 Problem zidentyfikowany

---

## 🚨 Problem

W logach Resend widoczne są błędne zapytania zwracające błąd 422:

```csv
id,created_at,api_key_id,user_agent,method,endpoint,response_status
3938b4ff-c3b5-4529-95cd-b9ed0feaaa00,2025-12-10 13:16:14.473106+00,6d0439b9-3bb3-4eb5-9105-847da875a0fd,python-requests/2.32.4,GET,/emails/0,422
29afa4e4-1650-442d-bd90-34f0bdd06244,2025-12-10 16:18:18.654989+00,6d0439b9-3bb3-4eb5-9105-847da875a0fd,python-requests/2.32.4,GET,/emails/0,422
c8503742-0b66-4e00-97e3-979abb4a35f6,2025-12-10 17:11:36.381576+00,6d0439b9-3bb3-4eb5-9105-847da875a0fd,python-requests/2.32.4,GET,/emails/0,422
```

---

## 🔍 Analiza

### 1. User-Agent: `python-requests/2.32.4`

**Wniosek:** Zapytania pochodzą z kodu **Python**, używającego biblioteki `requests`.

**Problem:** W projekcie ByteClinic **nie ma żadnego kodu w Pythonie**:
- ✅ Edge Functions: TypeScript/JavaScript
- ✅ Frontend: React/TypeScript
- ✅ Backend: Supabase Edge Functions (Deno)
- ❌ **Brak plików `.py`**

### 2. Nieprawidłowy endpoint: `GET /emails/0`

**Błąd:** `"0"` nie jest poprawnym ID emaila w Resend API.

**Poprawne endpointy Resend API:**
- ✅ `POST /emails` - wysyłanie nowego emaila
- ✅ `GET /emails/{email_id}` - sprawdzanie statusu (gdzie `email_id` to UUID)
- ❌ `GET /emails/0` - **BŁĄD!** "0" to nie UUID

**Dokumentacja Resend:**
```
GET /emails/{email_id}
email_id: UUID returned from POST /emails
```

### 3. Status 422 (Unprocessable Entity)

**Znaczenie:** Resend API odrzuca zapytanie z powodu:
- Nieprawidłowego formatu ID (oczekuje UUID, dostaje "0")
- Lub brak takiego emaila o ID "0"

---

## 🎯 Możliwe źródła problemu

### Opcja 1: Zewnętrzny skrypt testowy

Ktoś może lokalnie uruchomić skrypt Python, który testuje API:

```python
import requests

# BŁĘDNY KOD - przykład co może być uruchomione
response = requests.get(
    'https://api.resend.com/emails/0',  # ← BŁĄD!
    headers={'Authorization': f'Bearer {RESEND_API_KEY}'}
)
```

**Dlaczego "0"?**
- Możliwa próba testowania z domyślną/przykładową wartością
- Niezainicjalizowana zmienna: `email_id = 0`
- Błąd w logice: `email_id = email_id or 0`

### Opcja 2: Integracja z innym systemem

Jeśli ByteClinic jest zintegrowane z zewnętrznym systemem (np. CRM w Pythonie), który próbuje sprawdzać status emaili.

### Opcja 3: Skrypt monitorujący/diagnostyczny

Ktoś może uruchomić skrypt do monitorowania/testowania Resend API.

---

## ✅ Co wiemy na pewno

1. **Zapytania NIE pochodzą z Edge Functions** (używają `fetch`, nie `requests`)
2. **Projekt ByteClinic nie zawiera kodu Python**
3. **Endpoint `/emails/0` jest nieprawidłowy** (Resend oczekuje UUID)
4. **Wszystkie 3 zapytania używają tego samego API key** (`6d0439b9-3bb3-4eb5-9105-847da875a0fd`)

---

## 🔧 Rozwiązanie

### Krok 1: Znajdź źródło zapytań

**Sprawdź:**

1. **Lokalne skrypty:**
   ```bash
   # Szukaj plików Python w projekcie
   find . -name "*.py" -type f
   ```

2. **Historia poleceń:**
   ```bash
   # Linux/Mac
   history | grep python
   history | grep resend
   
   # Windows PowerShell
   Get-History | Select-String -Pattern "python|resend"
   ```

3. **Procesy Python:**
   ```bash
   # Linux/Mac
   ps aux | grep python
   
   # Windows PowerShell
   Get-Process | Where-Object {$_.ProcessName -like "*python*"}
   ```

### Krok 2: Zatrzymaj nieprawidłowe zapytania

Jeśli znajdziesz skrypt:
1. **Zatrzymaj proces:**
   ```bash
   # Zakończ proces Python
   pkill -f "resend"
   ```

2. **Usuń lub napraw skrypt:**
   - Jeśli testowy → usuń
   - Jeśli produkcyjny → napraw endpoint

### Krok 3: Prawidłowy sposób sprawdzania statusu emaila

**W Pythonie (jeśli potrzebne):**

```python
import requests

RESEND_API_KEY = "re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA"

# 1. Wyślij email (otrzymasz email_id)
response = requests.post(
    'https://api.resend.com/emails',
    headers={
        'Authorization': f'Bearer {RESEND_API_KEY}',
        'Content-Type': 'application/json'
    },
    json={
        'from': 'onboarding@resend.dev',
        'to': 'test@example.com',
        'subject': 'Test',
        'html': '<p>Test</p>'
    }
)

email_id = response.json()['id']  # UUID, np. "a1b2c3d4-..."

# 2. Sprawdź status (używając UUID, nie "0")
status_response = requests.get(
    f'https://api.resend.com/emails/{email_id}',  # ← POPRAWNIE!
    headers={'Authorization': f'Bearer {RESEND_API_KEY}'}
)

print(status_response.json())
```

**W Edge Function (obecne rozwiązanie - poprawne):**

```typescript
// Edge Functions używają fetch - to jest OK
const resendResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: MAIL_FROM,
    to: email,
    subject: subject,
    html: html_content
  })
});

const { id: emailId } = await resendResponse.json();
// emailId to UUID, NIE "0"
```

---

## 📊 Wpływ na system

### ✅ Brak wpływu na produkcję

- Błędne zapytania **nie pochodzą z Edge Functions**
-System powiadomień ByteClinic **działa poprawnie**
- Edge Functions używają poprawnych endpointów

### ⚠️ Rate limit warning

Błędne zapytania liczą się do limitu Resend:
- **Free tier:** 100 emaili/dzień
- **Rate limit:** 2 zapytania/sekundę

**Rekomendacja:** Zatrzymaj źródło błędnych zapytań, aby nie marnować limitu.

---

## 🎯 Następne kroki

1. **Priorytet 1:** Znajdź i zatrzymaj skrypt Python wykonujący błędne zapytania
2. **Priorytet 2:** Sprawdź czy to test, czy produkcyjny kod
3. **Priorytet 3:** Jeśli potrzebny Python → użyj poprawnego endpointa z UUID

---

## 📚 Dokumentacja

- **Resend API Docs:** https://resend.com/docs/api-reference/emails/send-email
- **Get Email Status:** https://resend.com/docs/api-reference/emails/retrieve-email
- **Rate Limits:** https://resend.com/docs/api-reference/introduction#rate-limit

---

## ✅ Podsumowanie

| Aspekt | Status |
|--------|--------|
| Źródło zapytań | 🔍 Zewnętrzny kod Python (nie ByteClinic) |
| Endpoint | ❌ Nieprawidłowy: `/emails/0` zamiast `/emails/{uuid}` |
| Edge Functions | ✅ Działają poprawnie (TypeScript) |
| Wpływ na produkcję | ✅ Brak - to oddzielny kod |
| Akcja wymagana | 🔧 Znajdź i zatrzymaj źródło błędnych zapytań |

**System ByteClinic działa poprawnie. Błędne zapytania pochodzą z zewnętrznego źródła.**