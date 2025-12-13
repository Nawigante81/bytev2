#!/bin/bash

# Skrypt do aktualizacji klucza API Resend w Supabase
# Użycie: bash update-resend-api-key.sh

echo "🔑 Aktualizacja klucza API Resend w Supabase"
echo "=============================================="
echo ""

# Nowy klucz API
NEW_API_KEY="re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA"

# Sprawdź czy Supabase CLI jest zainstalowane
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI nie jest zainstalowane"
    echo ""
    echo "📦 Instalacja Supabase CLI:"
    echo "   npm install -g supabase"
    echo ""
    echo "Lub instrukcja manualna poniżej..."
    echo ""
fi

echo "📝 INSTRUKCJA MANUALNA (przez Dashboard):"
echo "=========================================="
echo ""
echo "1. Otwórz Supabase Dashboard:"
echo "   https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions"
echo ""
echo "2. Przejdź do Edge Functions > Configuration"
echo ""
echo "3. Dodaj/Zaktualizuj następujące secrets:"
echo ""
echo "   RESEND_API_KEY = $NEW_API_KEY"
echo ""
echo "4. (Opcjonalnie) Dodaj też:"
echo "   MAIL_FROM = noreply@byteclinic.pl"
echo "   ADMIN_EMAIL = admin@byteclinic.pl"
echo ""
echo "5. Zapisz zmiany"
echo ""
echo "6. Zrestartuj edge functions (automatyczne po zapisie)"
echo ""

if command -v supabase &> /dev/null; then
    echo ""
    echo "💻 LUB użyj Supabase CLI:"
    echo "=========================="
    echo ""
    echo "Najpierw zaloguj się (jeśli jeszcze nie):"
    echo "  supabase login"
    echo ""
    echo "Następnie ustaw secret:"
    echo "  supabase secrets set RESEND_API_KEY=$NEW_API_KEY --project-ref wllxicmacmfzmqdnovhp"
    echo ""
    echo "Opcjonalnie dodaj pozostałe:"
    echo "  supabase secrets set MAIL_FROM=noreply@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp"
    echo "  supabase secrets set ADMIN_EMAIL=admin@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp"
    echo ""
fi

echo "✅ Po zaktualizowaniu secrets:"
echo "   1. Sprawdź logi edge functions"
echo "   2. Przetestuj wysyłanie emaili"
echo "   3. Uruchom: node test-auto-notifications.js"
echo ""