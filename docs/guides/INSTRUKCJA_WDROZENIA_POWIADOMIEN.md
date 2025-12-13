# 📧 Instrukcja wdrożenia systemu powiadomień email - ByteClinic

## 🎯 Cel
Skonfigurować automatyczne powiadomienia email dla wszystkich nowych zgłoszeń napraw i rezerwacji.

## ✅ Co jest już gotowe:
- ✅ **Resend API** skonfigurowany (klucz w .env)
- ✅ **Email templates** w `src/services/emailService.js`
- ✅ **Edge Functions** w `supabase/functions/`
- ✅ **Database API** w `supabase/functions/booking-api/`

## 🚀 KROK 1: Instalacja Supabase CLI

### Windows (zalecane):
```powershell
# Pobierz najnowszą wersję z GitHub
# https://github.com/supabase/cli/releases/latest
# Pobierz supabase_windows_amd64.zip
# Rozpakuj do C:\supabase\
# Dodaj C:\supabase\bin do PATH
```

### Alternatywnie - przez PowerShell (z Chocolatey):
```powershell
# Najpierw zainstaluj Chocolatey jeśli nie masz:
# Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

choco install supabase
```

### Alternatywnie - przez Scoop:
```powershell
# Najpierw zainstaluj Scoop jeśli nie masz:
# iex (new-object net.webclient).downloadstring('https://get.scoop.sh')

scoop install supabase
```

## 🔑 KROK 2: Logowanie do Supabase
```powershell
supabase login
```
*Otworzy się przeglądarka - zaloguj się swoim kontem Supabase*

## 🔗 KROK 3: Połączenie z projektem
```powershell
supabase link --project-ref glwqpjqvivzkbbvluxdd
```

## 📤 KROK 4: Wdróż Edge Functions
```powershell
supabase functions deploy notify-new-diagnosis
supabase functions deploy booking-api
```

## ⚙️ KROK 5: Konfiguracja w panelu Supabase

### 5.1 Ustaw sekrety Edge Functions:
1. Idź do: https://supabase.com/dashboard/project/glwqpjqvivzkbbvluxdd
2. Menu: **Edge Functions**
3. Kliknij: **notify-new-diagnosis**
4. Zakładka: **Secrets**
5. Dodaj zmienne:
   ```
   RESEND_API_KEY=re_iG485bPM_Js6RzEvtZ9upTNrLk4s1VirV
   MAIL_FROM=serwis@byteclinic.pl
   ADMIN_EMAIL=TWÓJ_EMAIL_ADMINA@byteclinic.pl
   ```

### 5.2 Utwórz Database Webhook:
1. Menu: **Database** → **Webhooks**
2. Kliknij: **"Create a new hook"**
3. Ustaw:
   - **Name:** `notify-new-diagnosis`
   - **Table:** `diagnosis_requests`
   - **Events:** ☑️ Insert
   - **Type:** `HTTP Request`
   - **Method:** `POST`
   - **URL:** `https://glwqpjqvivzkbbvluxdd.supabase.co/functions/v1/notify-new-diagnosis`

## 🧪 KROK 6: Testowanie
1. Wejdź na stronę `/kontakt`
2. Wypełnij formularz
3. Sprawdź email (w tym SPAM!)

## 📊 Monitorowanie logów
```powershell
# Sprawdź logi funkcji
supabase functions logs notify-new-diagnosis

# Zobacz logi webhook
# Panel Supabase: Database → Webhooks → notify-new-diagnosis → View logs
```

## 🔧 Rozwiązywanie problemów

### Email nie przychodzi?
1. **Sprawdź sekrety** - Edge Functions → notify-new-diagnosis → Secrets
2. **Sprawdź logi funkcji** - `supabase functions logs notify-new-diagnosis`
3. **Sprawdź folder SPAM**
4. **Sprawdź webhook** - Database → Webhooks → notify-new-diagnosis → View logs

### Błędy instalacji Supabase CLI?
- **Uprawnienia:** Uruchom PowerShell jako Administrator
- **PATH:** Upewnij się że `supabase` jest w PATH systemu
- **Antivirus:** Niektóre AV mogą blokować instalację

### Test webhook ręcznie:
```powershell
curl -X POST "https://glwqpjqvivzkbbvluxdd.supabase.co/functions/v1/notify-new-diagnosis" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "record": {
      "id": "test-123",
      "name": "Test User",
      "email": "test@example.com",
      "phone": "+48 123 456 789",
      "device": "Laptop test",
      "message": "Test message from system"
    }
  }'
```

## 📧 Email Templates - co otrzymasz:

### Nowe zgłoszenie naprawy:
```
🔔 Nowe zgłoszenie #ABC12345
👤 Klient: Jan Kowalski
📧 Email: jan@example.com
📱 Telefon: +48 123 456 789
💻 Urządzenie: Dell Latitude 5520
📝 Opis: Laptop nie włącza się po aktualizacji Windows
```

## ✅ Oczekiwany rezultat:
Po zakończeniu wszystkich kroków będziesz otrzymywać automatyczne powiadomienia email o każdym nowym zgłoszeniu naprawy na Twojej stronie. System będzie działać 24/7 bez Twojej ingerencji.

## 📞 Wsparcie:
Jeśli coś nie działa:
1. Sprawdź logi komendą `supabase functions logs notify-new-diagnosis`
2. Upewnij się że wszystkie sekrety są ustawione
3. Sprawdź webhook w panelu Supabase
4. Przetestuj ręcznie komendą curl

**Gotowy do wdrożenia? Zaczynaj od Krok 1! 🚀**
