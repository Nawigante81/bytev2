#!/bin/bash

# 🔧 Skrypt do generowania faviconów dla ByteClinic
# Data: 2025-12-02
# Autor: ByteClinic Team

echo "🔧 Rozpoczynam generowanie faviconów dla ByteClinic..."

# Sprawdź czy logo.png istnieje
if [ ! -f "public/logo.png" ]; then
    echo "❌ Błąd: Plik public/logo.png nie istnieje!"
    echo "💡 Upewnij się, że plik logo.png znajduje się w folderze public/"
    exit 1
fi

# Utwórz foldery jeśli nie istnieją
mkdir -p public/icons
mkdir -p public/favicons

# OG Image (1200x630px)
echo "📸 Tworzenie Open Graph image (1200x630)..."
magick convert public/logo.png -resize 1200x630 -quality 95 public/og.png
magick convert public/logo.png -resize 1200x630 -quality 90 public/og.jpg
echo "✅ Open Graph images utworzone"

# Twitter Card (1200x600px)
echo "🐦 Tworzenie Twitter Card image (1200x600)..."
magick convert public/logo.png -resize 1200x600 -quality 95 public/twitter-card.png
echo "✅ Twitter Card image utworzone"

# Standardowe favicony
echo "🔖 Tworzenie standardowych faviconów..."
sizes=(16 32 48 64 96 128 192 256 384 512)
for size in "${sizes[@]}"; do
    echo "  - ${size}x${size}"
    magick convert public/logo.png -resize ${size}x${size} public/favicons/favicon-${size}x${size}.png
done
echo "✅ Standardowe favicony utworzone"

# Apple Touch Icons
echo "🍎 Tworzenie Apple Touch Icons..."
apple_sizes=(57 60 72 76 114 120 144 152 180)
for size in "${apple_sizes[@]}"; do
    echo "  - ${size}x${size}"
    magick convert public/logo.png -resize ${size}x${size} public/favicons/apple-touch-icon-${size}x${size}.png
done

# Kopiuj główne ikony do root
cp public/favicons/apple-touch-icon-180x180.png public/apple-touch-icon.png
cp public/favicons/favicon-32x32.png public/favicon-32x32.png
cp public/favicons/favicon-16x16.png public/favicon-16x16.png
echo "✅ Apple Touch Icons skopiowane"

# Utwórz favicon.ico
echo "📄 Tworzenie favicon.ico..."
magick convert public/favicons/favicon-16x16.png public/favicons/favicon-32x32.png public/favicon.ico
echo "✅ favicon.ico utworzone"

# PWA Icons (192x192 i 512x512)
echo "📱 Tworzenie PWA icons..."
magick convert public/logo.png -resize 72x72 public/icons/icon-72x72.png
magick convert public/logo.png -resize 96x96 public/icons/icon-96x96.png
magick convert public/logo.png -resize 128x128 public/icons/icon-128x128.png
magick convert public/logo.png -resize 144x144 public/icons/icon-144x144.png
magick convert public/logo.png -resize 152x152 public/icons/icon-152x152.png
magick convert public/logo.png -resize 192x192 public/icons/icon-192x192.png
magick convert public/logo.png -resize 384x384 public/icons/icon-384x384.png
magick convert public/logo.png -resize 512x512 public/icons/icon-512x512.png
echo "✅ PWA icons utworzone"

# Utwórz summary image dla Twitter (120x120)
echo "📋 Tworzenie Twitter summary image..."
magick convert public/logo.png -resize 120x120 public/logo-summary.png
echo "✅ Twitter summary image utworzone"

# Utwórz raport podsumowujący
echo "📊 Tworzenie raportu podsumowującego..."
cat > public/favicon-report.txt << EOF
# 🔧 Raport generowania faviconów ByteClinic
# Data: $(date)
# Status: ✅ Zakończone pomyślnie

## 📁 Wygenerowane pliki:

### Open Graph Images:
- og.png (1200x630) ✅
- og.jpg (1200x630) ✅

### Twitter Cards:
- twitter-card.png (1200x600) ✅
- logo-summary.png (1200x120) ✅

### Standardowe favicony:
$(ls public/favicons/favicon-*.png | wc -l) plików w różnych rozmiarach ✅

### Apple Touch Icons:
$(ls public/favicons/apple-touch-icon-*.png | wc -l) plików ✅

### PWA Icons:
$(ls public/icons/icon-*.png | wc -l) plików ✅

### Główne ikony:
- apple-touch-icon.png (180x180) ✅
- favicon.ico (16x16, 32x32) ✅
- favicon-16x16.png ✅
- favicon-32x32.png ✅

## 📝 Następne kroki:

1. ✅ Pliki zostały wygenerowane w folderze public/
2. 🔄 Dodaj odpowiednie linki do index.html
3. 🧪 Przetestuj w narzędziach debugowania
4. 📱 Zweryfikuj PWA w przeglądarce

## 🔗 Linki do narzędzi testowania:
- Facebook Debugger: https://developers.facebook.com/tools/debug/
- Twitter Validator: https://cards-dev.twitter.com/validator
- PWA Tester: https://www.pwabuilder.com/test

## 📊 Statystyki:
- Całkowita liczba plików: $(find public/favicons public/icons public -name "*.png" -o -name "*.ico" | wc -l)
- Foldery utworzone: public/favicons/, public/icons/
- Czas wykonania: $(date)
EOF

echo "📊 Raport zapisany w public/favicon-report.txt"

# Podsumowanie
echo ""
echo "🎉 GENEROWANIE ZAKOŃCZONE POMYŚLNIE!"
echo ""
echo "📁 Pliki zostały utworzone w:"
echo "   - public/og.png, public/og.jpg"
echo "   - public/twitter-card.png"
echo "   - public/favicons/ (favicony)"
echo "   - public/icons/ (PWA icons)"
echo "   - public/apple-touch-icon.png"
echo "   - public/favicon.ico"
echo ""
echo "📋 Sprawdź public/favicon-report.txt po szczegóły"
echo ""
echo "🚀 Następne kroki:"
echo "1. Dodaj linki do faviconów w index.html"
echo "2. Przetestuj w Facebook Debugger"
echo "3. Przetestuj w Twitter Card Validator"
echo "4. Zweryfikuj PWA manifest"
echo ""
echo "💡 Użyj './generate-favicons.sh --help' po więcej opcji"

# Opcjonalnie: automatyczne dodanie do index.html
if [ "$1" = "--add-to-index" ]; then
    echo "🔄 Dodawanie linków do index.html..."
    
    # Sprawdź czy index.html istnieje
    if [ -f "index.html" ]; then
        # Utwórz backup
        cp index.html index.html.backup
        
        # Dodaj linki do faviconów (tuż przed zamknięciem </head>)
        sed -i 's|</head>|  <!-- Favicon -->\n  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />\n  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />\n  <link rel="shortcut icon" href="/favicon.ico" />\n\n  <!-- Apple Touch Icons -->\n  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />\n  <link rel="apple-touch-icon" sizes="152x152" href="/favicons/apple-touch-icon-152x152.png" />\n  <link rel="apple-touch-icon" sizes="120x120" href="/favicons/apple-touch-icon-120x120.png" />\n  <link rel="apple-touch-icon" sizes="76x76" href="/favicons/apple-touch-icon-76x76.png" />\n\n  <!-- PWA Manifest -->\n  <link rel="manifest" href="/site.webmanifest" />\n  <meta name="theme-color" content="#0a0f1a" />\n</head>|' index.html
        
        echo "✅ Linki dodane do index.html"
        echo "💾 Utworzono backup: index.html.backup"
    else
        echo "⚠️ index.html nie znaleziony"
    fi
fi

echo ""
echo "✨ Gotowe! Favicony zostały wygenerowane dla ByteClinic."