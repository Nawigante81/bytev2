# Fix: Formularz kontaktowy - E-maile nie docierają

## Problem
Resetowanie hasła działa (e-maile docierają), ale wiadomości z formularza kontaktowego nie docierają do administratora.

## Analiza przyczyny

### Dlaczego resetowanie hasła działa?
- Supabase Auth obsługuje resetowanie hasła **wewnętrznie**
- Używa własnego systemu wysyłki emaili
- Nie zależy od edge functions notify-system czy process-pending-notifications

### Dlaczego formularz kontaktowy nie działa?
Formularz kontaktowy używa innego flow:
```
Formularz → notify-system → tabela notifications → process-pending-notifications → Resend API
```

Problem może występować na kilku poziomach:

#### 1. Brak konfiguracji ADMIN_EMAIL w Supabase
Najprawdopodobniejsza przyczyna! 

**Gdzie sprawdzić:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Zmienna `ADMIN_EMAIL` musi być ustawiona (np. `serwis@byteclinic.pl`)

**Skutek braku:** 
- Administrator nie dostaje kopii zgłoszenia
- Tylko klient dostaje email potwierdzający (jeśli w ogóle)

#### 2. Brak lub nieprawidłowy RESEND_API_KEY
**Gdzie sprawdzić:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Zmienna `RESEND_API_KEY` musi zawierać prawidłowy klucz z Resend.com

**Skutek braku:**
- Wszystkie emaile pozostają w statusie `pending` w tabeli `notifications`
- Funkcja `process-pending-notifications` zwraca błąd 500

#### 3. Brak konfiguracji MAIL_FROM
**Gdzie sprawdzić:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Zmienna `MAIL_FROM` powinna być ustawiona (np. `serwis@byteclinic.pl`)

**Skutek braku:**
- Używany domyślny adres `onboarding@resend.dev`
- Może powodować problemy z dostawalnością emaili
- Emaile mogą trafiać do SPAM

## Rozwiązanie

### Krok 1: Ustaw wymagane zmienne w Supabase

1. Przejdź do Supabase Dashboard
2. Settings → Edge Functions → Secrets
3. Dodaj następujące zmienne:

```bash
ADMIN_EMAIL=serwis@byteclinic.pl
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx  # Twój klucz z Resend.com
MAIL_FROM=serwis@byteclinic.pl       # Zweryfikowana domena w Resend
```

**WAŻNE:** Po dodaniu secrets, musisz **ponownie wdrożyć** edge functions!

### Krok 2: Wdróż ponownie Edge Functions

```bash
cd /ścieżka/do/projektu

# Zaloguj się do Supabase
supabase login

# Połącz z projektem
supabase link --project-ref [twój-project-ref]

# Wdróż funkcje
supabase functions deploy notify-system
supabase functions deploy process-pending-notifications
```

### Krok 3: Zweryfikuj konfigurację Resend

1. Przejdź do [Resend Dashboard](https://resend.com/domains)
2. Sprawdź czy domena `byteclinic.pl` jest zweryfikowana
3. Sprawdź limity: plan Free ma limit **100 emaili/dzień** i **2 requesty/sekundę**
4. Sprawdź czy klucz API ma uprawnienia do wysyłki

### Krok 4: Test systemu

Uruchom skrypt diagnostyczny:

```bash
cd scripts/email
node diagnoza-email-system.js
```

Skrypt sprawdzi:
- ✅ Zmienne środowiskowe w .env
- ✅ Dostępność Edge Functions
- ✅ Tabela notifications (statusy: pending/sent/failed)
- ✅ Test wywołania notify-system
- ✅ Test Resend API

### Krok 5: Test formularza kontaktowego

1. Otwórz stronę `/kontakt`
2. Wypełnij formularz testowymi danymi:
   - Imię: Test
   - Email: twoj-email@example.com
   - Kategoria: dowolna
   - Temat: Test
   - Wiadomość: Test systemu emailowego
3. Wyślij formularz
4. Sprawdź:
   - ✅ Komunikat "Zgłoszenie wysłane!" (bez ostrzeżenia)
   - ✅ Email do klienta
   - ✅ Email do administratora (`ADMIN_EMAIL`)

## Wykonane zmiany w kodzie

### 1. Lepsze logowanie błędów (Contact.jsx, Pricing.jsx)

**Przed:**
```javascript
if (!notifyResponse.ok) {
  console.error('Błąd wysyłania powiadomienia:', await notifyResponse.text());
  // Nie przerywaj - zgłoszenie jest już w bazie
}

toast({
  title: "Zgłoszenie wysłane!", // ❌ Zawsze pokazuje sukces
  description: `...`
});
```

**Po:**
```javascript
// Sprawdź czy powiadomienie zostało wysłane
let emailWarning = false;
if (!notifyResponse.ok) {
  const errorText = await notifyResponse.text();
  console.error('Błąd wysyłania powiadomienia:', errorText);
  emailWarning = true;
} else {
  // Sprawdź czy processor faktycznie wysłał emaile
  const notifyResult = await notifyResponse.json();
  if (notifyResult.processor && notifyResult.processor.triggered && !notifyResult.processor.ok) {
    console.error('Błąd procesora powiadomień:', notifyResult.processor.error);
    emailWarning = true;
  }
}

// Wyświetl odpowiedni komunikat
if (emailWarning) {
  toast({
    title: "Zgłoszenie zapisane", // ⚠️ Ostrzeżenie o opóźnieniu
    description: `... Email potwierdzający może być opóźniony. ...`,
    variant: "default"
  });
} else {
  toast({
    title: "Zgłoszenie wysłane!", // ✅ Pełen sukces
    description: `...`
  });
}
```

**Korzyści:**
- ✅ Użytkownik widzi ostrzeżenie, jeśli email nie został wysłany
- ✅ Zgłoszenie jest zapisane w bazie, nawet jeśli email nie wyszedł
- ✅ Lepsze logowanie błędów w konsoli

### 2. Fallback email dla administratora (notify-system/index.ts)

**Dodano:**
```typescript
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'serwis@byteclinic.pl';
const FALLBACK_ADMIN_EMAIL = 'kontakt@byteclinic.pl'; // Fallback
console.log('🔧 notify-system starting with ADMIN_EMAIL:', ADMIN_EMAIL);
```

**Dla ważnych zgłoszeń (repair_request) wysyłane są 3 emaile:**
1. Do klienta (potwierdzenie)
2. Do ADMIN_EMAIL (główny admin)
3. Do FALLBACK_ADMIN_EMAIL (backup, jeśli inny niż główny)

**Korzyści:**
- ✅ Nawet jeśli główny email nie działa, zgłoszenie trafi na backup
- ✅ Lepsze logowanie - widać do kogo są wysyłane emaile

### 3. Lepsze logowanie w process-pending-notifications

**Istniejące:**
- ✅ Loguje każdy wysłany email
- ✅ Rate limiting: 600ms opóźnienia między emailami (Resend Free: 2 req/sec)
- ✅ Retry logic: maksymalnie 3 próby wysyłki
- ✅ Aktualizuje status notifications: pending → sent/failed

## Sprawdzenie statusu emaili w bazie danych

### SQL: Pokaż ostatnie powiadomienia

```sql
SELECT 
  notification_id,
  type,
  recipient_email,
  subject,
  status,
  retry_count,
  error_message,
  created_at,
  sent_at
FROM notifications
ORDER BY created_at DESC
LIMIT 20;
```

### SQL: Pokaż statystyki

```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM notifications
GROUP BY status
ORDER BY count DESC;
```

### SQL: Pokaż nieudane powiadomienia

```sql
SELECT 
  notification_id,
  recipient_email,
  subject,
  retry_count,
  error_message,
  created_at
FROM notifications
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## Typowe problemy i rozwiązania

### Problem: Wszystkie emaile w statusie "pending"

**Przyczyna:** 
- `process-pending-notifications` nie jest wywoływana
- lub RESEND_API_KEY jest nieprawidłowy

**Rozwiązanie:**
1. Sprawdź RESEND_API_KEY w Supabase Secrets
2. Sprawdź logi Edge Function `process-pending-notifications`
3. Uruchom ręcznie: 
   ```bash
   curl -X POST https://[twój-project].supabase.co/functions/v1/process-pending-notifications \
     -H "Authorization: Bearer [service-role-key]" \
     -H "Content-Type: application/json"
   ```

### Problem: Emaile wysyłane, ale nie docierają

**Przyczyna:**
- MAIL_FROM używa niezweryfikowanej domeny
- Emaile trafiają do SPAM
- Resend blokuje wysyłkę

**Rozwiązanie:**
1. Zweryfikuj domenę w Resend Dashboard
2. Dodaj SPF, DKIM, DMARC records do DNS
3. Użyj domeny `byteclinic.pl` zamiast `onboarding@resend.dev`
4. Sprawdź folder SPAM

### Problem: Rate limit exceeded

**Przyczyna:**
- Resend Free: maksymalnie 2 requesty/sekundę
- Wysyłanych jest więcej emaili naraz

**Rozwiązanie:**
- Obecny kod już ma opóźnienie 600ms między emailami
- Jeśli problem występuje, rozważ upgrade Resend do płatnego planu
- Lub zwiększ opóźnienie do 1000ms

### Problem: Administrator nie dostaje emaili

**Przyczyna:**
- ADMIN_EMAIL nie jest ustawiony w Supabase Secrets
- ADMIN_EMAIL jest ustawiony na nieprawidłowy adres

**Rozwiązanie:**
1. Ustaw ADMIN_EMAIL w Supabase Secrets
2. Wdróż ponownie edge functions
3. Sprawdź czy email trafia do SPAM
4. Fallback email `kontakt@byteclinic.pl` powinien też dostać kopię (dla repair_request)

## Monitorowanie

### Sprawdzenie logów Edge Functions

1. Supabase Dashboard → Edge Functions
2. Wybierz funkcję (notify-system lub process-pending-notifications)
3. Kliknij "Logs"
4. Szukaj:
   - ✅ `📧 Sending notification`
   - ✅ `✅ Email sent successfully`
   - ❌ `❌ Failed to send notification`
   - ❌ `RESEND_API_KEY is not configured`

### Zalecane alerty

Skonfiguruj alerty w Supabase dla:
- ✅ Liczba failed notifications > 10
- ✅ Edge function zwraca błąd 500
- ✅ Brak sent notifications w ciągu ostatniej godziny (jeśli są zgłoszenia)

## Podsumowanie

### ✅ Co naprawiono:
1. ✅ Lepsze wykrywanie i raportowanie błędów wysyłki emaili
2. ✅ Fallback email dla administratora
3. ✅ Lepsze logowanie w notify-system
4. ✅ Dokładna dokumentacja problemu i rozwiązania

### ⚠️ Co wymaga konfiguracji:
1. ⚠️ Ustaw ADMIN_EMAIL w Supabase Secrets
2. ⚠️ Ustaw RESEND_API_KEY w Supabase Secrets
3. ⚠️ Ustaw MAIL_FROM w Supabase Secrets
4. ⚠️ Wdróż ponownie edge functions po dodaniu secrets
5. ⚠️ Zweryfikuj domenę w Resend Dashboard

### 📝 Następne kroki:
1. Uruchom `node scripts/email/diagnoza-email-system.js`
2. Przetestuj formularz kontaktowy
3. Sprawdź logi Edge Functions
4. Sprawdź tabelę notifications
5. Zweryfikuj czy administrator dostaje emaile

---

**Data:** 2025-12-27  
**Status:** ✅ Kod naprawiony, wymaga konfiguracji Supabase Secrets
