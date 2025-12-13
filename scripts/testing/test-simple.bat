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

echo Testowanie: notify-new-diagnosis
echo URL: %SUPABASE_URL%/functions/v1/notify-new-diagnosis
echo.

curl -X POST "%SUPABASE_URL%/functions/v1/notify-new-diagnosis" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -d "{\"record\":{\"id\":\"test-123\",\"name\":\"Jan Testowy\",\"email\":\"test@example.com\",\"phone\":\"+48123456789\",\"device\":\"Laptop\",\"message\":\"Test message\"}}"

echo.
echo.
echo ========================================
echo Test zakończony
echo ========================================
pause
