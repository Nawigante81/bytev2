#!/bin/bash
# Monitor systemu powiadomień ByteClinic
# Uruchamiaj co 2-5 minut

SUPABASE_URL="${SUPABASE_URL:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_KEY:-}}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "? Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "🔍 Monitor powiadomień - $(date)"
echo "========================================"

# Sprawdź pending notifications
echo "📊 Sprawdzam pending notifications..."

PENDING_COUNT=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/notifications?status=eq.pending&select=notification_id" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  | jq '. | length')

echo "Znaleziono $PENDING_COUNT powiadomień pending"

if [ "$PENDING_COUNT" -gt 0 ]; then
  echo "📤 Wywołuję process-pending-notifications..."
  
  RESPONSE=$(curl -s -X POST \
    "$SUPABASE_URL/functions/v1/process-pending-notifications" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d '{}')
  
  echo "📊 Odpowiedź: $RESPONSE"
  
  # Sprawdź czy są nowe powiadomienia
  sleep 5
  NEW_COUNT=$(curl -s -X GET \
    "$SUPABASE_URL/rest/v1/notifications?status=eq.pending&select=notification_id" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    | jq '. | length')
  
  echo "Po przetworzeniu: $NEW_COUNT pending"
  
  if [ "$NEW_COUNT" -gt 0 ]; then
    echo "⚠️  Nadal są powiadomienia pending - sprawdź logi Edge Functions"
  else
    echo "✅ Wszystkie powiadomienia przetworzone"
  fi
else
  echo "✅ Brak pending notifications"
fi

echo ""
echo "💡 Sprawdź logi w Supabase Dashboard:"
echo "   https://app.wllxicmacmfzmqdnovhp.supabase.co/logs/edge-functions"
echo ""
