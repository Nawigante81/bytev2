#!/bin/bash
# Monitor systemu powiadomień ByteClinic - Optymalizowany dla uruchamiania co minutę
# Wersja: 2.0 - z logowaniem i obsługą błędów

SUPABASE_URL="${SUPABASE_URL:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_KEY:-}}"
LOG_FILE="monitor-powiadomien.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
    echo "? Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY" | tee -a "$LOG_FILE"
    exit 1
fi

# Funkcja logowania
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Funkcja sprawdzenia połączenia
check_connection() {
    if ! curl -s --max-time 5 "$SUPABASE_URL/rest/v1/" >/dev/null 2>&1; then
        log "❌ Błąd połączenia z Supabase"
        return 1
    fi
    return 0
}

# Sprawdź pending notifications
check_pending() {
    PENDING_RESPONSE=$(curl -s -X GET \
        "$SUPABASE_URL/rest/v1/notifications?status=eq.pending&select=notification_id" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "apikey: $SERVICE_KEY" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        PENDING_COUNT=$(echo "$PENDING_RESPONSE" | jq '. | length' 2>/dev/null || echo "0")
        echo "$PENDING_COUNT"
    else
        echo "0"
    fi
}

# Główna funkcja monitorowania
main() {
    log "🔍 Monitor powiadomień - uruchomienie co minutę"
    log "=============================================="
    
    # Sprawdź połączenie
    if ! check_connection; then
        log "⏸️  Pomijam cykl - brak połączenia"
        return 1
    fi
    
    # Sprawdź pending notifications
    PENDING_COUNT=$(check_pending)
    log "📊 Pending notifications: $PENDING_COUNT"
    
    if [ "$PENDING_COUNT" -gt 0 ]; then
        log "📤 Wywołuję process-pending-notifications..."
        
        RESPONSE=$(curl -s -w "%{http_code}" -X POST \
            "$SUPABASE_URL/functions/v1/process-pending-notifications" \
            -H "Authorization: Bearer $SERVICE_KEY" \
            -H "Content-Type: application/json" \
            -d '{}' \
            -o response.txt 2>/dev/null)
        
        HTTP_CODE="${RESPONSE: -3}"
        
        if [ "$HTTP_CODE" = "200" ]; then
            log "✅ Edge function odpowiedziała poprawnie (HTTP $HTTP_CODE)"
            
            # Sprawdź szczegóły odpowiedzi
            SENT_COUNT=$(cat response.txt | jq '.sent // 0' 2>/dev/null || echo "0")
            FAILED_COUNT=$(cat response.txt | jq '.failed // 0' 2>/dev/null || echo "0")
            
            log "📈 Przetworzono: $SENT_COUNT sent, $FAILED_COUNT failed"
            
            # Sprawdź czy są nowe powiadomienia po 5 sekundach
            sleep 5
            NEW_COUNT=$(check_pending)
            log "🔄 Po przetworzeniu: $NEW_COUNT pending"
            
            if [ "$NEW_COUNT" -gt 0 ]; then
                log "⚠️  Nadal są powiadomienia pending - sprawdź logi Edge Functions"
            else
                log "✅ Wszystkie powiadomienia przetworzone"
            fi
        else
            log "❌ Błąd Edge function (HTTP $HTTP_CODE)"
            log "📄 Odpowiedź: $(cat response.txt 2>/dev/null | head -c 200)..."
        fi
        
        # Sprzątanie
        rm -f response.txt
    else
        log "✅ Brak pending notifications"
    fi
    
    log "💡 Logi: https://app.wllxicmacmfzmqdnovhp.supabase.co/logs/edge-functions"
    log "---"
}

# Uruchom główną funkcję
main "$@"
