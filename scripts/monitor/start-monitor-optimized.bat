@echo off
echo ================================================
echo 🚀 URUCHAMIAM OPTYMALIZACJĘ OPOŹNIEŃ POWIADOMIEŃ
echo ================================================
echo.
echo Monitor będzie uruchamiany co 1 minutę
echo Aby zatrzymać: Ctrl+C w tym oknie
echo.
echo Logi będą zapisywane w: monitor-powiadomien.log
echo.
pause

:loop
echo [%date% %time%] Uruchamiam monitor powiadomień...
bash monitor-powiadomien.sh
echo.
echo Czekam 60 sekund do następnego sprawdzenia...
echo.
timeout /t 60 /nobreak >nul
goto loop