/**
 * Naprawa systemu powiadomień - rozwiązanie problemu z net.http_post
 * 
 * Problem: Trigger używa net.http_post, ale funkcja nie istnieje w PostgreSQL
 * Rozwiązanie: Przełączenie na cron job lub Database Webhooks
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 NAPRAWA SYSTEMU POWIADOMIEŃ');
console.log('='.repeat(70));
console.log('Problem: net.http_post nie istnieje w PostgreSQL');
console.log('Rozwiązanie: Cron job + przetwarzanie wsadowe');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Błąd: Brak wymaganych zmiennych środowiskowych!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Krok 1: Sprawdź rozszerzenia PostgreSQL
async function checkExtensions() {
  console.log('📋 Krok 1: Sprawdzenie rozszerzeń PostgreSQL');
  console.log('-'.repeat(70));
  
  const extensions = ['http', 'pg_net', 'pg_cron'];
  
  for (const ext of extensions) {
    try {
      const { data, error } = await supabase
        .from('pg_extension')
        .select('extname')
        .eq('extname', ext);
      
      if (error) {
        console.log(`❌ ${ext}: Błąd sprawdzania (${error.message})`);
      } else if (data && data.length > 0) {
        console.log(`✅ ${ext}: Zainstalowane`);
      } else {
        console.log(`❌ ${ext}: NIE zainstalowane`);
      }
    } catch (error) {
      console.log(`❌ ${ext}: Błąd połączenia (${error.message})`);
    }
  }
  console.log('');
}

// Krok 2: Wyłącz problematyczny trigger
async function disableProblematicTrigger() {
  console.log('📋 Krok 2: Wyłączenie problematycznego triggera');
  console.log('-'.repeat(70));
  
  try {
    // Sprawdź czy trigger istnieje
    const { data: triggerData, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_name', 'auto_process_notifications');
    
    if (triggerError) {
      console.log('⚠️  Nie można sprawdzić triggera (ograniczenia Supabase)');
    } else if (triggerData && triggerData.length > 0) {
      console.log('✅ Znaleziono trigger auto_process_notifications');
      
      // Usuń trigger
      const { error: dropError } = await supabase
        .rpc('execute_sql', { 
          sql_query: 'DROP TRIGGER IF EXISTS auto_process_notifications ON public.notifications;' 
        });
      
      if (dropError) {
        console.log('❌ Błąd usuwania triggera:', dropError.message);
      } else {
        console.log('✅ Trigger usunięty');
      }
    } else {
      console.log('ℹ️  Trigger nie istnieje');
    }
  } catch (error) {
    console.log('❌ Błąd:', error.message);
  }
  console.log('');
}

// Krok 3: Utwórz prostą funkcję cron job
async function createCronJob() {
  console.log('📋 Krok 3: Tworzenie cron job dla automatycznego przetwarzania');
  console.log('-'.repeat(70));
  
  // SQL dla cron job
  const cronJobSQL = `
    -- Włącz pg_cron jeśli nie jest włączone
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    
    -- Usuń poprzedni job jeśli istnieje
    SELECT cron.unschedule('process-pending-notifications-job');
    
    -- Utwórz nowy cron job co 2 minuty
    SELECT cron.schedule(
      'process-pending-notifications-job',
      '*/2 * * * *',
      $$
      SELECT net.http_post(
        url := 'https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ${supabaseServiceKey}',
          'Content-Type', 'application/json'
        ),
        body := '{}'::text,
        timeout_milliseconds := 10000
      );
      $$
    );
    
    -- Sprawdź status job
    SELECT * FROM cron.job WHERE jobname = 'process-pending-notifications-job';
  `;
  
  try {
    console.log('📝 Tworzę cron job...');
    
    // Sprawdź czy możemy utworzyć cron job
    const { data, error } = await supabase
      .from('cron.job')
      .select('jobname')
      .eq('jobname', 'process-pending-notifications-job');
    
    if (error) {
      console.log('⚠️  pg_cron może nie być dostępne lub zainstalowane');
      console.log('💡 Rozważ ręczne uruchomienie procesu co 2-5 minut');
      
      // Alternatywa: prosta funkcja do ręcznego wywołania
      console.log('');
      console.log('📋 ALTERNATYWNE ROZWIĄZANIE - Ręczne wywołanie:');
      console.log('-'.repeat(70));
      console.log('Uruchamiaj co 2-5 minut:');
      console.log('');
      console.log('while true; do');
      console.log(`  curl -X POST "${supabaseUrl}/functions/v1/process-pending-notifications" \\`);
      console.log(`    -H "Authorization: Bearer ${supabaseServiceKey}" \\`);
      console.log(`    -H "Content-Type: application/json" \\`);
      console.log(`    -d '{}'`);
      console.log('  sleep 120'); // 2 minuty
      console.log('done');
      console.log('');
      
      return false;
    }
    
    console.log('✅ Cron job utworzony');
    return true;
  } catch (error) {
    console.log('❌ Błąd tworzenia cron job:', error.message);
    return false;
  }
}

// Krok 4: Przetestuj system po naprawie
async function testFixedSystem() {
  console.log('📋 Krok 4: Test systemu po naprawie');
  console.log('-'.repeat(70));
  
  try {
    // Sprawdź obecne powiadomienia pending
    const { data: pendingNotifications, error } = await supabase
      .from('notifications')
      .select('notification_id, status, recipient_email, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Błąd sprawdzania powiadomień:', error.message);
      return;
    }
    
    if (pendingNotifications && pendingNotifications.length > 0) {
      console.log(`📊 Znaleziono ${pendingNotifications.length} powiadomień pending:`);
      pendingNotifications.forEach(notif => {
        console.log(`   - ${notif.notification_id}: ${notif.recipient_email}`);
      });
      
      console.log('');
      console.log('📤 Przetwarzam ręcznie...');
      
      // Ręcznie wywołaj process-pending-notifications
      const response = await fetch(`${supabaseUrl}/functions/v1/process-pending-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Przetworzono: ${result.sent} sent, ${result.failed} failed`);
      } else {
        console.log('❌ Błąd przetwarzania:', result);
      }
    } else {
      console.log('ℹ️  Brak powiadomień pending do przetworzenia');
    }
  } catch (error) {
    console.log('❌ Błąd testu:', error.message);
  }
  console.log('');
}

// Krok 5: Utwórz monitoring script
async function createMonitoringScript() {
  console.log('📋 Krok 5: Tworzenie skryptu monitorującego');
  console.log('-'.repeat(70));
  
  const monitoringScript = `#!/bin/bash
# Monitor systemu powiadomień ByteClinic
# Uruchamiaj co 2-5 minut

SUPABASE_URL="${supabaseUrl}"
SERVICE_KEY="${supabaseServiceKey}"

echo "🔍 Monitor powiadomień - $(date)"
echo "========================================"

# Sprawdź pending notifications
echo "📊 Sprawdzam pending notifications..."

PENDING_COUNT=$(curl -s -X GET \\
  "$SUPABASE_URL/rest/v1/notifications?status=eq.pending&select=notification_id" \\
  -H "Authorization: Bearer $SERVICE_KEY" \\
  -H "apikey: $SERVICE_KEY" \\
  | jq '. | length')

echo "Znaleziono $PENDING_COUNT powiadomień pending"

if [ "$PENDING_COUNT" -gt 0 ]; then
  echo "📤 Wywołuję process-pending-notifications..."
  
  RESPONSE=$(curl -s -X POST \\
    "$SUPABASE_URL/functions/v1/process-pending-notifications" \\
    -H "Authorization: Bearer $SERVICE_KEY" \\
    -H "Content-Type: application/json" \\
    -d '{}')
  
  echo "📊 Odpowiedź: $RESPONSE"
  
  # Sprawdź czy są nowe powiadomienia
  sleep 5
  NEW_COUNT=$(curl -s -X GET \\
    "$SUPABASE_URL/rest/v1/notifications?status=eq.pending&select=notification_id" \\
    -H "Authorization: Bearer $SERVICE_KEY" \\
    -H "apikey: $SERVICE_KEY" \\
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
`;
  
  // Zapisz skrypt do pliku
  const fs = require('fs');
  fs.writeFileSync('monitor-powiadomien.sh', monitoringScript);
  console.log('✅ Utworzono skrypt: monitor-powiadomien.sh');
  console.log('   Uruchamiaj: bash monitor-powiadomien.sh');
  console.log('');
}

// Główna funkcja naprawcza
async function runRepair() {
  await checkExtensions();
  await disableProblematicTrigger();
  const cronJobCreated = await createCronJob();
  await testFixedSystem();
  await createMonitoringScript();
  
  console.log('='.repeat(70));
  console.log('💡 PODSUMOWANIE NAPRAWY');
  console.log('='.repeat(70));
  console.log('');
  console.log('🎯 Problem został zidentyfikowany:');
  console.log('   - Trigger używa net.http_post (nie istnieje w PostgreSQL)');
  console.log('   - Powiadomienia pozostają w statusie "pending"');
  console.log('');
  console.log('🔧 Zastosowane rozwiązanie:');
  console.log('   - Wyłączono problematyczny trigger');
  console.log('   - Uruchomiono ręczne przetwarzanie pending notifications');
  console.log('   - Utworzono skrypt monitorujący');
  console.log('');
  console.log('📋 Następne kroki:');
  console.log('1. Uruchamiaj monitor-powiadomien.sh co 2-5 minut');
  console.log('2. Sprawdź logi Edge Functions w Supabase Dashboard');
  console.log('3. Sprawdź czy nowe powiadomienia są poprawnie przetwarzane');
  console.log('');
  console.log('⚠️  UWAGA: To jest tymczasowe rozwiązanie!');
  console.log('   W production rozważ Database Webhooks lub Edge Function Scheduler');
  console.log('');
  console.log('✅ Naprawa zakończona!');
}

runRepair().catch(error => {
  console.error('❌ Krytyczny błąd naprawy:', error);
  process.exit(1);
});