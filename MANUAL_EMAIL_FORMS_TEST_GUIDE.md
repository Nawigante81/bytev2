# Przewodnik Testowania Formularzy Email - ByteClinic

## Przegląd
Ten dokument zawiera instrukcje testowania wszystkich formularzy, które wysyłają emaile w aplikacji ByteClinic.

## Zidentyfikowane Formularze Wysyłające Email

### 1. **Formularz Kontaktowy** (`src/pages/Contact.jsx`)
   - **Lokalizacja**: `/kontakt`
   - **Metoda wysyłki**: `notify-system` Edge Function
   - **Tabela bazy danych**: `requests`
   - **Funkcjonalność**:
     - Przyjmuje zgłoszenia kontaktowe od klientów
     - 8 kategorii zgłoszeń (naprawa, rezerwacja, wsparcie, etc.)
     - Wysyła email do administratora z kopią potwierdzenia do klienta
     - Priorytetyzacja zgłoszeń (high/medium/low)

### 2. **System Rezerwacji** (`src/components/BookingSystem.jsx`)
   - **Lokalizacja**: `/rezerwacja` 
   - **Metoda wysyłki**: `create-booking` Edge Function + `notify-system`
   - **Tabele bazy danych**: `bookings`, `requests`
   - **Funkcjonalność**:
     - 4-krokowy proces rezerwacji
     - 5 typów usług (diagnoza, naprawa, konsultacja, odbiór)
     - Wysyła email potwierdzenia rezerwacji do klienta
     - Administrator otrzymuje kopię

### 3. **Modal Diagnozy** (`src/components/DiagnosisModal.jsx`)
   - **Lokalizacja**: Dostępny przez różne strony jako modal
   - **Metoda wysyłki**: **NIE WYSYŁA EMAIL** (tylko zapis do bazy)
   - **Tabela bazy danych**: `diagnosis_requests`
   - **Uwaga**: Ten formularz zapisuje tylko do bazy danych, nie wysyła emaili

### 4. **Modal Zamówienia** (`src/components/OrderModal.jsx`)
   - **Lokalizacja**: Dostępny przez różne strony jako modal
   - **Metoda wysyłki**: **NIE WYSYŁA EMAIL** (tylko zapis do bazy)
   - **Tabela bazy danych**: `service_orders`
   - **Uwaga**: Ten formularz zapisuje tylko do bazy danych, nie wysyła emaili

### 5. **Repair Tracker** (`src/components/RepairTracker.jsx`)
   - **Lokalizacja**: `/sledzenie` lub w panelu klienta
   - **Metoda wysyłki**: `notify-system` (powiadomienia o statusie)
   - **Tabela bazy danych**: `diagnosis_requests`
   - **Funkcjonalność**:
     - Wyświetla status napraw
     - Może wysyłać powiadomienia email o zmianie statusu
     - Powiadomienia o gotowości do odbioru

## Instrukcje Testowania Manualnego

### Test 1: Formularz Kontaktowy

1. **Przejdź do**: `https://byteclinic.pl/kontakt`

2. **Wypełnij formularz**:
   - Imię i nazwisko: Twoje imię
   - Email: Twój email testowy
   - Telefon: (opcjonalne)
   - Typ urządzenia: Wybierz np. "Laptop"
   - Kategoria: Wybierz "Naprawa urządzenia"
   - Temat: "Test formularza kontaktowego"
   - Wiadomość: "To jest test systemu email"

3. **Wyślij formularz**

4. **Sprawdź**:
   - ✅ Toast notification o sukcesie
   - ✅ Email potwierdzenia w skrzynce (Twój email)
   - ✅ Email do administratora (kontakt@byteclinic.pl)
   - ✅ Zapis w tabeli `requests` w Supabase
   - ✅ Powiadomienie w tabeli `notifications`

5. **Weryfikacja emaila**:
   - [ ] Email zawiera numer zgłoszenia (TKT-...)
   - [ ] Email zawiera wszystkie dane formularza
   - [ ] Email ma poprawną kategorię i priorytet
   - [ ] Email jest responsywny (sprawdź na telefonie)
   - [ ] Linki w emailu działają
   - [ ] Dane kontaktowe są poprawne

### Test 2: System Rezerwacji

1. **Przejdź do**: `https://byteclinic.pl/rezerwacja`

2. **Krok 1 - Wybierz datę**:
   - Wybierz dowolny dostępny dzień

3. **Krok 2 - Wybierz godzinę**:
   - Wybierz dostępny slot czasowy

4. **Krok 3 - Wybierz usługę**:
   - Wybierz np. "Diagnoza laptopa"

5. **Krok 4 - Dane kontaktowe**:
   - Imię: Twoje imię
   - Email: Automatycznie wypełniony (jeśli zalogowany)
   - Telefon: Twój numer
   - Urządzenie: Wybierz typ
   - Opis: "Test rezerwacji"

6. **Potwierdź rezerwację**

7. **Sprawdź**:
   - ✅ Ekran potwierdzenia z szczegółami
   - ✅ Email potwierdzenia w skrzynce
   - ✅ Email do administratora
   - ✅ Zapis w tabeli `requests` (type='booking')
   - ✅ Powiadomienie w tabeli `notifications`

8. **Weryfikacja emaila**:
   - [ ] Email zawiera numer rezerwacji (BC-...)
   - [ ] Email zawiera datę i godzinę
   - [ ] Email zawiera nazwę usługi i cenę
   - [ ] Email zawiera dane kontaktowe serwisu
   - [ ] Link do śledzenia działa
   - [ ] Email jest responsywny

### Test 3: Walidacja Formularzy

#### Test 3.1: Formularz Kontaktowy - Walidacja
Sprawdź czy walidacja działa dla:
- [ ] Puste pole "Imię i nazwisko"
- [ ] Niepoprawny format email (np. "test@test")
- [ ] Brak wybranej kategorii
- [ ] Pusty temat
- [ ] Pusta wiadomość
- [ ] Brak zgody na przetwarzanie danych

#### Test 3.2: System Rezerwacji - Walidacja
Sprawdź czy walidacja działa dla:
- [ ] Brak wybranej daty
- [ ] Brak wybranej godziny
- [ ] Brak wybranej usługi
- [ ] Puste pole "Imię"
- [ ] Pusty telefon
- [ ] Brak wybranego urządzenia

### Test 4: Kategorie i Priorytety

#### Test 4.1: Wszystkie Kategorie Zgłoszeń
Przetestuj każdą kategorię formularza kontaktowego:
- [ ] Naprawa urządzenia (priority: high)
- [ ] Pytanie o rezerwację (priority: medium)
- [ ] Wsparcie techniczne (priority: medium)
- [ ] Pytanie o fakturę (priority: low)
- [ ] Pytanie ogólne (priority: low)
- [ ] Reklamacja (priority: high)
- [ ] Sugestia (priority: low)
- [ ] Współpraca biznesowa (priority: medium)

#### Test 4.2: Wszystkie Typy Usług Rezerwacji
Przetestuj każdy typ usługi:
- [ ] Diagnoza laptopa (60 min, 99 PLN)
- [ ] Diagnoza PC (90 min, 129 PLN)
- [ ] Szybka naprawa (45 min, 79 PLN)
- [ ] Konsultacja IT (30 min, 59 PLN)
- [ ] Odbiór sprzętu (30 min, darmowe)

### Test 5: Szablony Email

Sprawdź czy każdy szablon email zawiera:
- [ ] Logo/nagłówek ByteClinic
- [ ] Tytuł odpowiadający typowi emaila
- [ ] Wszystkie wymagane dane
- [ ] Dane kontaktowe (telefon, email, adres)
- [ ] Stopkę z informacjami o firmie
- [ ] Responsywny layout (max-width: 600px)
- [ ] Poprawne kolory i style
- [ ] Wersję tekstową (fallback)

### Test 6: Edge Functions

#### Test 6.1: notify-system
```bash
curl -X POST https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-system \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "repair_request",
    "recipient": "test@example.com",
    "data": {
      "id": "TEST-001",
      "name": "Test User",
      "email": "test@example.com",
      "message": "Test notification"
    }
  }'
```

#### Test 6.2: create-booking
```bash
curl -X POST https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/create-booking \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "BC-TEST",
    "email": "test@example.com",
    "name": "Test User",
    "date": "2025-12-14",
    "time": "10:00",
    "service": "Diagnoza laptopa"
  }'
```

## Checklist Końcowy

### Funkcjonalność
- [ ] Formularz kontaktowy zapisuje do bazy
- [ ] Formularz kontaktowy wysyła email do klienta
- [ ] Formularz kontaktowy wysyła email do administratora
- [ ] System rezerwacji tworzy rezerwację
- [ ] System rezerwacji wysyła email potwierdzenia
- [ ] System rezerwacji zapisuje do bazy
- [ ] Wszystkie kategorie działają poprawnie
- [ ] Wszystkie typy usług działają poprawnie

### Walidacja
- [ ] Walidacja pól wymaganych działa
- [ ] Walidacja formatu email działa
- [ ] Walidacja zgody na przetwarzanie działa
- [ ] Komunikaty błędów są czytelne
- [ ] Toast notifications działają

### Email
- [ ] Emaile docierają do odbiorców
- [ ] Emaile są responsywne
- [ ] Emaile zawierają wszystkie dane
- [ ] Linki w emailach działają
- [ ] Dane kontaktowe są poprawne
- [ ] Szablony są estetyczne

### Baza Danych
- [ ] Tabela `requests` zapisuje zgłoszenia
- [ ] Tabela `bookings` zapisuje rezerwacje (jeśli istnieje)
- [ ] Tabela `notifications` zapisuje powiadomienia
- [ ] Tabela `diagnosis_requests` zapisuje diagnozy
- [ ] Tabela `service_orders` zapisuje zamówienia

### Edge Functions
- [ ] notify-system jest dostępny
- [ ] create-booking jest dostępny
- [ ] Edge functions zwracają poprawne odpowiedzi
- [ ] Edge functions logują błędy

## Problemy i Rozwiązania

### Problem: Email nie dochodzi
**Rozwiązania**:
1. Sprawdź folder spam
2. Sprawdź logi Supabase Edge Functions
3. Sprawdź konfigurację Resend API key
4. Sprawdź limit rate limiting (5 emaili/godzinę per adres)

### Problem: Błąd przy wysyłce formularza
**Rozwiązania**:
1. Sprawdź console w przeglądarce (F12)
2. Sprawdź połączenie z Supabase
3. Sprawdź uprawnienia RLS w tabelach
4. Sprawdź czy Edge Functions są wdrożone

### Problem: Walidacja nie działa
**Rozwiązania**:
1. Sprawdź kod walidacji w komponencie
2. Sprawdź czy wszystkie pola mają wymagane atrybuty
3. Sprawdź komunikaty błędów w konsoli

## Monitoring i Logi

### Supabase Logi
```
Dashboard -> Logs -> Edge Functions
```
Sprawdź logi dla:
- `notify-system`
- `create-booking`
- `process-pending-notifications`

### Tabela notifications
```sql
SELECT * FROM notifications 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Tabela requests
```sql
SELECT * FROM requests 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

## Wyniki Testów Automatycznych

Uruchom testy automatyczne:
```bash
npm run test
node test/test-all-email-forms.js
node test/comprehensive-email-system.test.js
```

## Kontakt w razie problemów

- Email: kontakt@byteclinic.pl
- Telefon: +48 724 316 523
- GitHub Issues: https://github.com/Nawigante81/bytev2/issues

---

**Data utworzenia**: 2025-12-13
**Wersja**: 1.0
**Autor**: ByteClinic Team
