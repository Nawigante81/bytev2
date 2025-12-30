#!/bin/bash

# Ścieżka do projektu
PROJECT_DIR="/var/www/bytev2"  # ZMIEŃ NA SWOJĄ ŚCIEŻKĘ
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Utwórz katalog na logi
mkdir -p "$LOG_DIR"

echo "[$TIMESTAMP] Starting news refresh..." >> "$LOG_DIR/cron.log"

# Przejdź do katalogu projektu
cd "$PROJECT_DIR" || exit 1

# Automatycznie wykryj ścieżkę do node z fallback
NODE_BIN=$(which node 2>/dev/null)
if [ -z "$NODE_BIN" ]; then
  # Try common paths
  for path in /usr/local/bin/node /usr/bin/node /opt/homebrew/bin/node; do
    if [ -x "$path" ]; then
      NODE_BIN="$path"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo "[$TIMESTAMP] ❌ Error: node binary not found" >> "$LOG_DIR/cron.log"
  exit 1
fi

# Odśwież tech news
echo "[$TIMESTAMP] Fetching tech news..." >> "$LOG_DIR/cron.log"
"$NODE_BIN" tools/fetch-tech-news.mjs >> "$LOG_DIR/tech-news.log" 2>&1
TECH_STATUS=$?

# Odśwież IT news
echo "[$TIMESTAMP] Fetching IT news..." >> "$LOG_DIR/cron.log"
"$NODE_BIN" tools/fetch-it-news.mjs >> "$LOG_DIR/it-news.log" 2>&1
IT_STATUS=$?

# Podsumowanie
if [ $TECH_STATUS -eq 0 ] && [ $IT_STATUS -eq 0 ]; then
    echo "[$TIMESTAMP] ✅ News refresh completed successfully" >> "$LOG_DIR/cron.log"
else
    echo "[$TIMESTAMP] ❌ News refresh failed (Tech: $TECH_STATUS, IT: $IT_STATUS)" >> "$LOG_DIR/cron.log"
fi

exit 0
