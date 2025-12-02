# 📧 Instrukcja wdrożenia powiadomień email

## Krok 1: Zainstaluj Supabase CLI

```bash
npm install -g supabase
```

## Krok 2: Zaloguj się do Supabase

```bash
supabase login
```

## Krok 3: Połącz z projektem

```bash
supabase link --project-ref twoj-project-ref
```

*Project ref znajdziesz w URL panelu Supabase: `https://supabase.com/dashboard/project/[TWÓJ-PROJECT-REF]`*

## Krok 4: Wdróż funkcję Edge

```bash
supabase functions deploy notify-new-diagnosis
```

## Krok 5: Ustaw sekrety (zmienne środowiskowe)

W panelu Supabase przejdź do: **Edge Functions** → **notify-new-diagnosis** → **Secrets**

Dodaj następujące sekrety:

```
RESEND_API_KEY=re_VsWYgLjD_BwtDXREEBVTk4U8UdQJCAzZa
MAIL_FROM=serwis@byteclinic.pl
ADMIN_EMAIL=admin@tech-majster.pro
```

### Jak uzyskać RESEND_API_KEY?

1. Zarejestruj się na https://resend.com (darmowe 100 emaili/dzień)
2. Przejdź do **API Keys**
3. Kliknij **Create API Key**
4. Skopiuj klucz (zaczyna się od `re_`)

**Uwaga:** Aby wysyłać z własnej domeny (np. serwis@byteclinic.pl), musisz zweryfikować domenę w Resend. Inaczej użyj domeny testowej: `onboarding@resend.dev`

## Krok 6: Utwórz Database Webhook w Supabase

1. Przejdź do panelu Supabase: **Database** → **Webhooks**
2. Kliknij **Create a new hook**
3. Ustaw:
   - **Name:** `notify-new-diagnosis`
   - **Table:** `diagnosis_requests`
   - **Events:** Zaznacz tylko `Insert`
   - **Type:** `HTTP Request`
   - **Method:** `POST`
   - **URL:** `https://[TWÓJ-PROJECT-REF].supabase.co/functions/v1/notify-new-diagnosis`
   - **HTTP Headers:**
     ```
     Content-Type: application/json
     Authorization: Bearer [TWÓJ-ANON-KEY]
     ```
     *Anon key znajdziesz w: Settings → API → Project API keys → anon/public*

4. Kliknij **Confirm**

## Krok 7: Testowanie

1. Wejdź na stronę: `https://twoja-strona.pl/kontakt`
2. Wypełnij formularz i wyślij zgłoszenie
3. Sprawdź swoją skrzynkę email (sprawdź też SPAM!)

## Troubleshooting

### Email nie przychodzi?

1. **Sprawdź logi funkcji Edge:**
   ```bash
   supabase functions logs notify-new-diagnosis
   ```

2. **Sprawdź webhook w Supabase:**
   - Database → Webhooks → notify-new-diagnosis → View logs

3. **Sprawdź czy sekrety są ustawione:**
   - Edge Functions → notify-new-diagnosis → Secrets

4. **Sprawdź folder SPAM** w emailu

### Błąd "Missing RESEND_API_KEY"?

Sekrety nie są ustawione. Zobacz Krok 5.

### Błąd "Missing ADMIN_EMAIL"?

Nie ustawiłeś swojego emaila w sekretach. Zobacz Krok 5.

---

## ✅ Gotowe!

Od teraz przy każdym nowym zgłoszeniu na stronie otrzymasz email z pełnymi danymi klienta! 📧
