# 🔧 **NAPRAWA BŁĘDU EMAIL - Resend API Error**

## 🚨 **Zidentyfikowany problem:**
```
Error: Resend email error
at sendEmail (notify-new-diagnosis/index.ts:26:11)
```

## ✅ **Diagnoza:**
Funkcja działa poprawnie, ale ma problem z wysyłką email przez Resend API.

## 🛠️ **ROZWIĄZANIE - Krok po kroku:**

### **KROK 1: Sprawdź sekrety w panelu Supabase**
1. Idź do: https://supabase.com/dashboard/project/glwqpjqvivzkbbvluxdd
2. **Edge Functions** → **notify-new-diagnosis** → **Secrets**

### **KROK 2: Zaktualizuj sekrety**
Usuń stare sekrety i dodaj poprawne:

```
RESEND_API_KEY=re_iG485bPM_Js6RzEvtZ9upTNrLk4s1VirV
MAIL_FROM=onboarding@resend.dev
ADMIN_EMAIL=TWÓJ_EMAIL@byteclinic.pl
```

### **KROK 3: Użyj domeny testowej (najłatwiejsze rozwiązanie)**
Dla testów użyj domeny Resend zamiast własnej:

```
MAIL_FROM=onboarding@resend.dev
```

### **KROK 4: Alternatywa - Nowy klucz Resend**
Jeśli stary klucz nie działa:

1. Idź na: https://resend.com
2. **API Keys** → **Create API Key**
3. Użyj nowego klucza (zaczyna się od `re_`)

## 🧪 **Test po naprawie:**
1. Wejdź na stronę `/kontakt`
2. Wyślij zgłoszenie testowe
3. Sprawdź email na podany adres

## 📧 **Uwagi dotyczące Resend:**
- **Darmowy plan:** 100 emaili dziennie
- **Własna domena:** Wymaga weryfikacji domeny w Resend
- **Testy:** Możesz użyć `onboarding@resend.dev`

## 🔍 **Sprawdzenie logów po naprawie:**
```bash
supabase functions logs notify-new-diagnosis
```

## ✅ **Oczekiwany rezultat:**
Po poprawnej konfiguracji sekretów będziesz otrzymywać powiadomienia email o każdym nowym zgłoszeniu!

---

**Najpierw spróbuj użyć `onboarding@resend.dev` zamiast swojej domeny - to powinno natychmiast rozwiązać problem!** 🚀