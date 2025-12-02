# 📧 Edge Functions - Powiadomienia Email

Ten folder zawiera funkcje Edge dla Supabase, które wysyłają powiadomienia email.

## 📁 Funkcje

### 1. `notify-new-diagnosis.ts`
**Cel:** Wysyła email do admina przy każdym nowym zgłoszeniu serwisowym.

**Kiedy się uruchamia:** Automatycznie po wstawieniu nowego rekordu do tabeli `diagnosis_requests`

**Co wysyła:** Email z danymi klienta (imię, email, telefon, kategoria, opis problemu)

### 2. `notify-comment-or-status.ts`
**Cel:** Wysyła email do klienta gdy:
- Dodasz komentarz do jego zgłoszenia
- Zmienisz status zgłoszenia

---

## 🚀 Szybki start

### Krok 1: Wdróż funkcję
```bash
supabase functions deploy notify-new-diagnosis
```

### Krok 2: Ustaw sekrety w panelu Supabase
```
RESEND_API_KEY=re_VsWYgLjD_BwtDXREEBVTk4U8UdQJCAzZa
MAIL_FROM=serwis@byteclinic.pl
ADMIN_EMAIL=admin@tech-majster.pro
```

### Krok 3: Utwórz Webhook
W panelu Supabase: **Database → Webhooks → Create hook**
- Table: `diagnosis_requests`
- Events: `Insert`
- URL: `https://[twoj-project].supabase.co/functions/v1/notify-new-diagnosis`

---

## 📚 Szczegółowe instrukcje

- **[DEPLOY-INSTRUCTIONS.md](./DEPLOY-INSTRUCTIONS.md)** - Pełna instrukcja wdrożenia krok po kroku
- **[SQL-WEBHOOK-SETUP.sql](./SQL-WEBHOOK-SETUP.sql)** - Alternatywna konfiguracja przez SQL

---

## 🔑 Gdzie znaleźć klucze?

### RESEND_API_KEY
1. Zarejestruj się na https://resend.com (darmowe!)
2. **API Keys** → **Create API Key**
3. Skopiuj klucz (zaczyna się od `re_`)

### Project Ref i Anon Key
**Panel Supabase:**
- **Project Ref:** W URL - `https://supabase.com/dashboard/project/[TO-JEST-REF]`
- **Anon Key:** **Settings → API → Project API keys → anon/public**

---

## ✅ Testowanie

Po konfiguracji:
1. Wejdź na `/kontakt`
2. Wypełnij formularz
3. Wyślij zgłoszenie
4. Sprawdź swoją skrzynkę email (i SPAM!)

### Logi
```bash
supabase functions logs notify-new-diagnosis
```

---

## 💡 Limity darmowe

**Resend (email):**
- 100 emaili/dzień
- 3000 emaili/miesiąc
- Wystarczy dla małej firmy!

**Supabase Edge Functions:**
- 500,000 wywołań/miesiąc
- Więcej niż potrzebujesz! 😎

---

## 🆘 Pomoc

**Email nie przychodzi?**
1. Sprawdź logi: `supabase functions logs notify-new-diagnosis`
2. Sprawdź sekrety w panelu: Edge Functions → Secrets
3. Sprawdź SPAM
4. Sprawdź czy webhook jest aktywny: Database → Webhooks

**Pytania?** Sprawdź [DEPLOY-INSTRUCTIONS.md](./DEPLOY-INSTRUCTIONS.md)
