# Szybkie rozwiązanie: Maile weryfikacyjne nie przychodzą

## 🎯 Problem
Nowi użytkownicy nie otrzymują maili weryfikacyjnych po rejestracji.

## 🚀 Najszybsze rozwiązanie (5 minut)

### Krok 1: Włącz Email Auth w Supabase
1. Wejdź na: https://supabase.com/dashboard
2. Wybierz projekt: `glwqpjqvivzkbbvluxdd`
3. Przejdź: **Authentication** → **Settings** → **Email Auth**
4. Włącz:
   - ✅ **Enable email confirmations**
   - ✅ **Enable email notifications**

### Krok 2: Sprawdź SMTP
W tym samym panelu: **Authentication** → **Settings** → **SMTP Settings**
- Wybierz: **Default (Supabase SMTP)**

### Krok 3: Test
```bash
node test-registration-email.js
```

## 🔍 Sprawdzenie DNS (wymagane)
Sprawdź czy domena `byteclinic.pl` ma poprawne rekordy DNS:
- **SPF**: `v=spf1 include:_spf.supabase.io ~all`
- **DKIM**: Wymagany przez Supabase

## 📞 Wsparcie
Jeśli problem nadal występuje:
1. Sprawdź logi: `supabase logs --type auth`
2. Skontaktuj się z administratorem domeny
3. Zweryfikuj DNS records

**Szacowany czas rozwiązania:** 5-15 minut