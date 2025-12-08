@echo off
echo ========================================
echo Test API Kontaktowego - ByteClinic
echo ========================================
echo.

set SUPABASE_URL=https://wllxicmacmfzmqdnovhp.supabase.co
set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok

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
