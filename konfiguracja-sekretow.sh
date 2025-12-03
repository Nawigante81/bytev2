#!/bin/bash

# 🔧 Skrypt automatycznej konfiguracji sekretów Supabase Edge Functions
# Uruchom ten skrypt po wdrożeniu funkcji Edge

echo "🚀 Konfigurowanie sekretów Edge Functions..."

# Sprawdź czy funkcje zostały wdrożone
echo "✅ Sprawdzam wdrożone funkcje..."
supabase functions list

echo ""
echo "📋 Następne kroki do wykonania ręcznie w panelu Supabase:"
echo ""
echo "1. OTWÓRZ PANEL SUPABASE:"
echo "   https://supabase.com/dashboard/project/glwqpjqvivzkbbvluxdd"
echo ""
echo "2. KONFIGURACJA SEKRETÓW:"
echo "   a) Menu: Edge Functions"
echo "   b) Kliknij: notify-new-diagnosis" 
echo "   c) Zakładka: Secrets"
echo "   d) Dodaj te zmienne:"
echo ""
echo "   RESEND_API_KEY=re_iG485bPM_Js6RzEvtZ9upTNrLk4s1VirV"
echo "   MAIL_FROM=serwis@byteclinic.pl"
echo "   ADMIN_EMAIL=TWÓJ_EMAIL_ADMINA@byteclinic.pl"
echo ""
echo "3. UTWORZENIE WEBHOOK:"
echo "   a) Menu: Database → Webhooks"
echo "   b) Kliknij: 'Create a new hook'"
echo "   c) Ustaw:"
echo "      - Name: notify-new-diagnosis"
echo "      - Table: diagnosis_requests" 
echo "      - Events: ☑️ Insert"
echo "      - Type: HTTP Request"
echo "      - Method: POST"
echo "      - URL: https://glwqpjqvivzkbbvluxdd.supabase.co/functions/v1/notify-new-diagnosis"
echo ""
echo "4. TESTOWANIE:"
echo "   Wejdź na stronę /kontakt i wypełnij formularz"
echo "   Sprawdź email (w tym SPAM!)"
echo ""
echo "🔍 MONITOROWANIE LOGÓW:"
echo "   supabase functions logs notify-new-diagnosis"
echo ""
echo "✅ Gotowe! System powiadomień będzie działał automatycznie."

# Test funkcji
echo ""
echo "🧪 Test funkcji (opcjonalnie):"
echo "curl -X POST \"https://glwqpjqvivzkbbvluxdd.supabase.co/functions/v1/notify-new-diagnosis\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer [TWÓJ_ANON_KEY]\" \\"
echo "  -d '{\"record\": {\"id\": \"test-123\", \"name\": \"Test User\", \"email\": \"test@example.com\", \"device\": \"Test device\", \"message\": \"Test message\"}}'"