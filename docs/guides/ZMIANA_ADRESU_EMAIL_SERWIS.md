# 📧 Zmiana adresu email serwisu na serwis@byteclinic.pl

**Data:** 2025-12-10  
**Status:** ✅ Zaktualizowano kod - wymaga wdrożenia edge function

---

## ✅ Co zostało zmienione

### 1. Adres odbiorcy zgłoszeń z formularza kontaktowego

**Przed:**
```typescript
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@byteclinic.pl';
```

**Po:**
```typescript
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'serwis@byteclinic.pl';
```

**Lokalizacja:** [`supabase/functions/notify-system/index.ts:6`](supabase/functions/notify-system/index.ts:6)

---

## 📊 Jak to działa teraz

Gdy klient wysyła wiadomość przez formularz kontaktowy:

1. **Klient otrzymuje potwierdzenie** na podany email
2. **Kopia trafia na:** `serwis@byteclinic.pl` ✨ (NOWY ADRES)
3. Email zawiera: imię, telefon, email klienta, opis problemu, numer zgłoszenia

---

## 🚀 Wymagane wdrożenie

Edge function `notify-system` musi być prze-deployowana, żeby zmiany zadziałały.

### Opcja 1: Supabase CLI (ZALECANE)

```bash
# Zaloguj się (jeśli jeszcze nie)
supabase login

# Wdróż zaktualizowaną funkcję
supabase functions deploy notify-system --project-ref wllxicmacmfzmqdnovhp
```

### Opcja 2: Przez Supabase Dashboard

1. Otwórz: https://app.supabase.com/project/wllxicmacmfzmqdnovhp/functions/notify-system

2. Kliknij **"Deploy New Version"** lub **"Redeploy"**

3. W oknie dialogowym wklej zaktualizowany kod z pliku:
   `supabase/functions/notify-system/index.ts`

4. Kliknij **"Deploy"**

### Opcja 3: Automatyczne wdrożenie przez Git (jeśli skonfigurowane)

Jeśli masz skonfigurowane automatyczne wdrożenia:
```bash
git add supabase/functions/notify-system/index.ts
git commit -m "Zmiana adresu email serwisu na serwis@byteclinic.pl"
git push
```

---

## 🔍 Weryfikacja po wdrożeniu

### 1. Sprawdź logi funkcji

```
Supabase Dashboard > Edge Functions > notify-system > Logs
```

Szukaj linii z nowym adresem email.

### 2. Test wysyłki

1. Przejdź na stronę kontaktową: https://byteclinic.pl/kontakt
2. Wypełnij formularz
3. Wyślij zgłoszenie
4. Sprawdź skrzynkę: **serwis@byteclinic.pl**

### 3. Sprawdź tabelę notifications

```sql
SELECT 
  notification_id,
  recipient_email,
  subject,
  created_at
FROM notifications
WHERE recipient_email = 'serwis@byteclinic.pl'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📝 Uwagi ważne

### Publiczny adres kontaktowy NIE zmieniony

Adresy widoczne na stronie (`kontakt@byteclinic.pl`) pozostają bez zmian:
- Stopka strony
- Strona kontaktowa
- Meta tagi
- Polityka prywatności

**To jest prawidłowe!** 
- `kontakt@byteclinic.pl` = publiczny adres widoczny dla użytkowników
- `serwis@byteclinic.pl` = wewnętrzny adres odbiorcy zgłoszeń

### Jeśli chcesz użyć innego adresu

Możesz nadpisać domyślny adres ustawiając zmienną w Supabase Secrets:

```bash
supabase secrets set ADMIN_EMAIL=inny-adres@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
```

Lub w Dashboard:
```
Settings > Edge Functions > Secrets
ADMIN_EMAIL = inny-adres@byteclinic.pl
```

---

## ✅ Checklist wdrożenia

- [ ] Edge function `notify-system` prze-deployowana
- [ ] Test wysyłki formularza kontaktowego wykonany
- [ ] Email dotarł na `serwis@byteclinic.pl`
- [ ] Logi funkcji nie pokazują błędów
- [ ] Tabela `notifications` zawiera wpisy z nowym adresem

---

## 🔗 Powiązane zmiany

Razem z tą zmianą zostały również zaktualizowane:
- ✅ Klucz API Resend: `re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA`
- ✅ System automatycznych powiadomień (triggers + edge functions)

---

## 📚 Dodatkowe zasoby

- **Instrukcja wdrożenia Supabase Functions:** https://supabase.com/docs/guides/functions/deploy
- **Dokumentacja notify-system:** `supabase/functions/notify-system/index.ts`
- **Aktualizacja klucza Resend:** `AKTUALIZACJA_RESEND_API_KEY.md`

---

**Następny krok:** Wdróż edge function używając jednej z powyższych metod!
