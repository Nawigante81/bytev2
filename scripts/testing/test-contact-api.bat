@echo off
echo ========================================
echo Test API Kontaktowego - ByteClinic
echo ========================================
echo.

if "%SUPABASE_URL%"=="" set SUPABASE_URL=https://wllxicmacmfzmqdnovhp.supabase.co
if "%SUPABASE_KEY%"=="" (
  echo Brak SUPABASE_KEY. Ustaw zmienna srodowiskowa SUPABASE_KEY i uruchom ponownie.
  pause
  exit /b 1
)

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
