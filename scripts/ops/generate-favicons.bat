@echo off
setlocal enabledelayedexpansion

echo 🔧 Rozpoczynam generowanie faviconów dla ByteClinic...

REM Sprawdź czy logo.png istnieje
if not exist "public\logo.png" (
    echo ❌ Błąd: Plik public\logo.png nie istnieje!
    echo 💡 Upewnij się, że plik logo.png znajduje się w folderze public/
    pause
    exit /b 1
)

REM Utwórz foldery jeśli nie istnieją
if not exist "public\icons" mkdir public\icons
if not exist "public\favicons" mkdir public\favicons

REM OG Image (1200x630px)
echo 📸 Tworzenie Open Graph image (1200x630)...
magick convert public\logo.png -resize 1200x630 -quality 95 public\og.png
magick convert public\logo.png -resize 1200x630 -quality 90 public\og.jpg
echo ✅ Open Graph images utworzone

REM Twitter Card (1200x600px)
echo 🐦 Tworzenie Twitter Card image (1200x600)...
magick convert public\logo.png -resize 1200x600 -quality 95 public\twitter-card.png
echo ✅ Twitter Card image utworzone

REM Standardowe favicony
echo 🔖 Tworzenie standardowych faviconów...
for %%s in (16 32 48 64 96 128 192 256 384 512) do (
    echo   - %%sx%%s
    magick convert public\logo.png -resize %%sx%%s public\favicons\favicon-%%sx%%s.png
)
echo ✅ Standardowe favicony utworzone

REM Apple Touch Icons
echo 🍎 Tworzenie Apple Touch Icons...
for %%s in (57 60 72 76 114 120 144 152 180) do (
    echo   - %%sx%%s
    magick convert public\logo.png -resize %%sx%%s public\favicons\apple-touch-icon-%%sx%%s.png
)

REM Kopiuj główne ikony do root
copy public\favicons\apple-touch-icon-180x180.png public\apple-touch-icon.png
copy public\favicons\favicon-32x32.png public\favicon-32x32.png
copy public\favicons\favicon-16x16.png public\favicon-16x16.png
echo ✅ Apple Touch Icons skopiowane

REM Utwórz favicon.ico
echo 📄 Tworzenie favicon.ico...
magick convert public\favicons\favicon-16x16.png public\favicons\favicon-32x32.png public\favicon.ico
echo ✅ favicon.ico utworzone

REM PWA Icons
echo 📱 Tworzenie PWA icons...
magick convert public\logo.png -resize 72x72 public\icons\icon-72x72.png
magick convert public\logo.png -resize 96x96 public\icons\icon-96x96.png
magick convert public\logo.png -resize 128x128 public\icons\icon-128x128.png
magick convert public\logo.png -resize 144x144 public\icons\icon-144x144.png
magick convert public\logo.png -resize 152x152 public\icons\icon-152x152.png
magick convert public\logo.png -resize 192x192 public\icons\icon-192x192.png
magick convert public\logo.png -resize 384x384 public\icons\icon-384x384.png
magick convert public\logo.png -resize 512x512 public\icons\icon-512x512.png
echo ✅ PWA icons utworzone

REM Utwórz summary image dla Twitter (120x120)
echo 📋 Tworzenie Twitter summary image...
magick convert public\logo.png -resize 120x120 public\logo-summary.png
echo ✅ Twitter summary image utworzone

REM Podsumowanie
echo.
echo 🎉 GENEROWANIE ZAKOŃCZONE POMYŚLNIE!
echo.
echo 📁 Pliki zostały utworzone w:
echo    - public\og.png, public\og.jpg
echo    - public\twitter-card.png
echo    - public\favicons\ (favicony)
echo    - public\icons\ (PWA icons)
echo    - public\apple-touch-icon.png
echo    - public\favicon.ico
echo.
echo 📋 Sprawdź public\favicon-report.txt po szczegóły
echo.
echo 🚀 Następne kroki:
echo 1. Dodaj linki do faviconów w index.html
echo 2. Przetestuj w Facebook Debugger
echo 3. Przetestuj w Twitter Card Validator
echo 4. Zweryfikuj PWA manifest

pause
