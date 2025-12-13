@echo off
echo ========================================
echo Test API Kontaktowego - ByteClinic
echo ========================================
echo.

set SUPABASE_URL=https://wllxicmacmfzmqdnovhp.supabase.co
set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok

echo Konfiguracja:
echo   URL: %SUPABASE_URL%
echo   API Key: %SUPABASE_KEY:~0,20%...
echo.

echo Testowanie endpointow...
echo.

echo [1/4] Testowanie: notify-new-diagnosis
curl -X POST "%SUPABASE_URL%/functions/v1/notify-new-diagnosis" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -d "{\"to\":\"test@example.com\",\"subject\":\"Test\",\"data\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"message\":\"Test message\"}}" ^
  -w "\nStatus: %%{http_code}\n" ^
  -s
echo.
echo.

echo [2/4] Testowanie: send-contact
curl -X POST "%SUPABASE_URL%/functions/v1/send-contact" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -d "{\"to\":\"test@example.com\",\"subject\":\"Test\",\"data\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"message\":\"Test message\"}}" ^
  -w "\nStatus: %%{http_code}\n" ^
  -s
echo.
echo.

echo [3/4] Testowanie: contact
curl -X POST "%SUPABASE_URL%/functions/v1/contact" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -d "{\"to\":\"test@example.com\",\"subject\":\"Test\",\"data\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"message\":\"Test message\"}}" ^
  -w "\nStatus: %%{http_code}\n" ^
  -s
echo.
echo.

echo [4/4] Testowanie: notify-system
curl -X POST "%SUPABASE_URL%/functions/v1/notify-system" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -d "{\"to\":\"test@example.com\",\"subject\":\"Test\",\"data\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"message\":\"Test message\"}}" ^
  -w "\nStatus: %%{http_code}\n" ^
  -s
echo.
echo.

echo ========================================
echo Podsumowanie:
echo ========================================
echo.
echo Jesli wszystkie zwrocily 404:
echo   - Edge Functions nie sa wdrozone
echo   - Musisz wdrozyc: supabase functions deploy
echo.
echo Jesli otrzymales 403:
echo   - Sprawdz API key
echo   - Sprawdz CORS w Supabase
echo.
echo Jesli otrzymales 500:
echo   - Funkcja istnieje ale ma blad
echo   - Sprawdz logi w Supabase Dashboard
echo.
echo Aby sprawdzic w przegladarce:
echo   1. Otworz: test-contact-api.html
echo   2. Otworz DevTools (F12) - Network
echo   3. Kliknij "Wyslij zgloszenie"
echo   4. Zobacz request URL, status, response
echo.
pause
