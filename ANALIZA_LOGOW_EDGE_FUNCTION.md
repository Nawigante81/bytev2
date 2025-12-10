# 🔍 Analiza logów Edge Function notify-system

**Status:** ✅ Edge function działa poprawnie (200 OK)  
**Problem:** Emaile prawdopodobnie nie są wysyłane przez Resend

---

## 📊 Analiza otrzymanych logów

```json
{
  "event_message": "POST | 200 | notify-system",
  "execution_time_ms": 333,
  "status_code": 200
}
```

### ✅ Co działa dobrze:

1. **Edge function `notify-system` odpowiada** - Status 200 OK
2. **Czas wykonania** - 333ms (dobry czas)
3. **Połączenie** - Formularz kontaktowy wywołuje funkcję poprawnie

---

## 🔍 Co to oznacza?

Edge function `notify-system` wykonuje się, ale nie wysyła emaili bezpośrednio. 

**Przepływ:**
```
1. Formularz → notify-system (✅ DZIAŁA - status 200)
   ↓
2. notify-system → Tworzy wpisy w tabeli 'notifications' (status: 'pending')
   ↓
3. Trigger → Wykrywa nowy 'pending' → Wywołuje process-pending-notifications
   ↓
4. process-pending-notifications → Wysyła przez Resend API
   ↓
5. Resend → Dostarcza email
```

**Problem prawdopodobnie w krokach 3-5!**

---

## 🎯 Następne kroki diagnostyczne

### Krok 1: Sprawdź tabelę notifications

```sql
SELECT 
  notification_id,
  type,
  recipient_email,
  status,
  created_at,
  sent_at,
  error_message
FROM notifications
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Jeśli widzisz wpisy ze statusem 'pending':**
→ Trigger NIE wywołuje `process-pending-notifications`  
→ Lub `process-pending-notifications` ma błąd

**Jeśli widzisz status 'sent':**
→ System działa, ale email może być w spamie

**Jeśli widzisz status 'failed':**
→ Patrz na `error_message` - prawdopodobnie brak RESEND_API_KEY

---

### Krok 2: Sprawdź czy trigger istnieje

```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_process_notifications';
```

**Jeśli brak wyniku:**
→ Trigger nie został utworzony - uruchom migrację

---

### Krok 3: Sprawdź logi process-pending-notifications

```
Supabase Dashboard > Edge Functions > process-pending-notifications > Logs
```

**Szukaj:**
- ✅ Wywołań funkcji (powinna być wywołana automatycznie po insert)
- ❌ Błędów "Missing RESEND_API_KEY"
- ❌ Błędów "Resend API error: 403"

**Jeśli brak logów:**
→ Funkcja nigdy nie została wywołana = trigger nie działa

---

### Krok 4: Test ręcznego wywołania

Wywołaj `process-pending-notifications` ręcznie:

```bash
curl -X POST \
  "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json"
```

**Lub użyj skryptu:**
```bash
node diagnoza-email-system.js
```

---

## 🔧 Najczęstsze przyczyny

### 1. RESEND_API_KEY nie jest ustawiony w Supabase Secrets

**Symptom:**
- notify-system działa (200)
- Tabela notifications ma wpisy 'pending'
- Brak logów w Resend

**Rozwiązanie:**
```bash
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
```

---

### 2. Trigger nie został utworzony

**Symptom:**
- notify-system działa (200)
- Tabela notifications ma wpisy 'pending'
- Status nie zmienia się na 'sent'

**Rozwiązanie:**
Uruchom migrację w Supabase SQL Editor:
```
supabase/migrations/20251210_setup_auto_notifications.sql
```

---

### 3. Edge function process-pending-notifications nie jest wdrożona

**Symptom:**
- notify-system działa (200)
- Trigger istnieje
- Ale logi pokazują błąd 404 lub timeout

**Rozwiązanie:**
```bash
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp
```

---

## 📋 Checklist debugowania

Przejdź przez każdy punkt:

- [ ] Logi notify-system pokazują 200 OK ✅ (już mamy)
- [ ] Tabela notifications ma nowe wpisy (sprawdź Krok 1)
- [ ] Wpisy mają status 'pending' czy 'sent'? (sprawdź Krok 1)
- [ ] Trigger istnieje w bazie (sprawdź Krok 2)
- [ ] RESEND_API_KEY jest w Supabase Secrets
- [ ] Edge function process-pending-notifications jest wdrożona
- [ ] Logi process-pending-notifications pokazują wywołania (sprawdź Krok 3)
- [ ] Test ręcznego wywołania (Krok 4)

---

## 🚀 Szybka naprawa (All-in-one)

Jeśli nie jesteś pewien co nie działa, wykonaj wszystko:

```bash
# 1. Ustaw secrets
supabase secrets set RESEND_API_KEY=re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp

# 2. Wdróż funkcję
supabase functions deploy process-pending-notifications --project-ref wllxicmacmfzmqdnovhp

# 3. Poczekaj 30 sekund

# 4. Uruchom migrację (w Supabase SQL Editor)
# Wklej: supabase/migrations/20251210_setup_auto_notifications.sql

# 5. Test
node test-auto-notifications.js
```

---

## 💡 Dodatkowa diagnoza

### Sprawdź czy MAIL_FROM jest poprawny

Jeśli używasz `noreply@byteclinic.pl`, ale domena nie jest zweryfikowana w Resend:

**Tymczasowo zmień na:**
```bash
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
```

### Sprawdź limity Resend

1. Otwórz: https://resend.com/overview
2. Sprawdź:
   - [ ] Czy nie przekroczyłeś limitu wysyłek?
   - [ ] Czy klucz API jest aktywny?
   - [ ] Czy domena jest zweryfikowana (jeśli używasz własnej)?

---

## 📊 Oczekiwany końcowy rezultat

Po naprawie w Resend Dashboard powinieneś zobaczyć:

```
Recent emails:
- To: klient@example.com | Subject: 🔧 Nowe zgłoszenie...
- To: serwis@byteclinic.pl | Subject: [ADMIN] 🔧 Nowe zgłoszenie...
```

---

## 🆘 Jeśli nadal nie działa

Uruchom pełną diagnostykę:

```bash
node diagnoza-email-system.js
```

Skrypt pokaże dokładnie gdzie jest problem i co zrobić.

---

**Następny krok:** Przejdź przez Checklist debugowania i wykonaj testy z Kroków 1-4.
