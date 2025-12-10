/**
 * Skrypt testowy dla systemu automatycznych powiadomień
 * Testuje czy trigger prawidłowo wywołuje edge function
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Błąd: Brak zmiennych środowiskowych');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧪 Testowanie systemu automatycznych powiadomień\n');

// Funkcja pomocnicza do oczekiwania
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testTriggerCreation() {
  console.log('📋 Test 1: Sprawdzanie czy trigger istnieje');
  console.log('─'.repeat(50));
  
  try {
    // Sprawdź trigger przez query do system catalog
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          event_object_table,
          action_timing
        FROM information_schema.triggers
        WHERE trigger_name = 'auto_process_notifications';
      `
    }).catch(() => ({ data: null, error: 'RPC nie dostępny' }));

    if (error || !data) {
      console.log('   ⚠️  Nie można zweryfikować triggera przez RPC');
      console.log('   💡 Sprawdź manualnie w Supabase Dashboard > Database > Triggers\n');
      return false;
    }

    if (data && data.length > 0) {
      console.log('   ✅ Trigger auto_process_notifications istnieje');
      console.log('   📊 Szczegóły:');
      console.log('      - Event:', data[0].event_manipulation);
      console.log('      - Tabela:', data[0].event_object_table);
      console.log('      - Timing:', data[0].action_timing);
      console.log('');
      return true;
    } else {
      console.log('   ❌ Trigger NIE istnieje');
      console.log('   💡 Uruchom migrację: supabase/migrations/20251210_setup_auto_notifications.sql\n');
      return false;
    }
  } catch (error) {
    console.log('   ⚠️  Błąd podczas sprawdzania:', error.message);
    return false;
  }
}

async function testNotificationInsert() {
  console.log('📋 Test 2: Wstawianie testowego powiadomienia');
  console.log('─'.repeat(50));
  
  try {
    const testNotificationId = `test_${Date.now()}`;
    const testEmail = 'test@example.com';
    
    console.log(`   📧 Tworzenie powiadomienia: ${testNotificationId}`);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        notification_id: testNotificationId,
        type: 'test',
        recipient_email: testEmail,
        recipient_name: 'Test User',
        subject: 'Test automatycznego powiadomienia',
        html_content: '<p>To jest test systemu automatycznych powiadomień</p>',
        text_content: 'To jest test systemu automatycznych powiadomień',
        status: 'pending',
        data: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
      .single();

    if (error) {
      console.log('   ❌ Błąd podczas wstawiania:', error.message);
      console.log('   💡 Sprawdź czy tabela notifications istnieje i masz uprawnienia\n');
      return null;
    }

    console.log('   ✅ Powiadomienie wstawione pomyślnie');
    console.log('   📊 ID:', data.notification_id);
    console.log('   📊 Status:', data.status);
    console.log('');

    return testNotificationId;
  } catch (error) {
    console.log('   ❌ Błąd:', error.message);
    return null;
  }
}

async function checkNotificationStatus(notificationId, maxAttempts = 5) {
  console.log('📋 Test 3: Sprawdzanie statusu powiadomienia');
  console.log('─'.repeat(50));
  
  console.log(`   ⏳ Czekam ${maxAttempts} sekund na przetworzenie...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    await wait(1000);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .single();

      if (error) {
        console.log(`   ⚠️  Próba ${i + 1}/${maxAttempts}: Nie można pobrać powiadomienia`);
        continue;
      }

      console.log(`   📊 Próba ${i + 1}/${maxAttempts}: Status = ${data.status}`);

      if (data.status === 'sent') {
        console.log('   ✅ Powiadomienie zostało przetworzone (status: sent)');
        console.log('   🎉 Trigger działa prawidłowo!\n');
        return true;
      } else if (data.status === 'failed') {
        console.log('   ⚠️  Powiadomienie ma status: failed');
        console.log('   💡 Sprawdź error_message:', data.error_message);
        console.log('   💡 Sprawdź logi Edge Function w Supabase Dashboard\n');
        return false;
      }
    } catch (error) {
      console.log(`   ⚠️  Próba ${i + 1}/${maxAttempts}: Błąd:`, error.message);
    }
  }

  console.log('   ⏱️  Timeout - powiadomienie wciąż ma status pending');
  console.log('   💡 Możliwe przyczyny:');
  console.log('      1. Trigger nie został utworzony (sprawdź Test 1)');
  console.log('      2. Edge function nie działa (sprawdź deployment)');
  console.log('      3. Błąd w net.http_post (sprawdź Postgres logs)');
  console.log('      4. Service Role Key nie jest skonfigurowany\n');
  return false;
}

async function checkEdgeFunctionLogs() {
  console.log('📋 Test 4: Informacje o logach');
  console.log('─'.repeat(50));
  
  console.log('   📊 Gdzie sprawdzić logi:');
  console.log('');
  console.log('   1. Postgres Logs (trigger):');
  console.log('      Supabase Dashboard > Logs > Postgres Logs');
  console.log('      Szukaj: "Triggered process-pending-notifications"');
  console.log('');
  console.log('   2. Edge Functions Logs:');
  console.log('      Supabase Dashboard > Edge Functions > process-pending-notifications > Logs');
  console.log('      Sprawdź czy funkcja została wywołana');
  console.log('');
  console.log('   3. Błędy HTTP:');
  console.log('      Szukaj w Postgres Logs: "Edge call failed"');
  console.log('');
}

async function testManualEdgeFunctionCall(notificationId) {
  console.log('📋 Test 5: Ręczne wywołanie Edge Function');
  console.log('─'.repeat(50));
  
  try {
    console.log('   🔄 Wywołuję edge function manualnie...');
    
    const { data, error } = await supabase.functions.invoke('process-pending-notifications', {
      body: { notification_id: notificationId }
    });

    if (error) {
      console.log('   ❌ Błąd:', error.message);
      console.log('   💡 Sprawdź czy edge function jest wdrożona\n');
      return false;
    }

    console.log('   ✅ Edge function wywołana pomyślnie');
    console.log('   📊 Odpowiedź:', JSON.stringify(data, null, 2));
    console.log('');
    return true;
  } catch (error) {
    console.log('   ❌ Błąd:', error.message);
    return false;
  }
}

async function cleanup(notificationId) {
  console.log('🧹 Czyszczenie testowych danych');
  console.log('─'.repeat(50));
  
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', notificationId);

    if (error) {
      console.log('   ⚠️  Nie można usunąć testowego powiadomienia:', error.message);
    } else {
      console.log('   ✅ Testowe powiadomienie usunięte');
    }
  } catch (error) {
    console.log('   ⚠️  Błąd podczas czyszczenia:', error.message);
  }
  console.log('');
}

async function runAllTests() {
  console.log('🚀 Rozpoczynam testy systemu automatycznych powiadomień');
  console.log('='.repeat(50));
  console.log('');

  // Test 1: Sprawdź czy trigger istnieje
  const triggerExists = await testTriggerCreation();
  
  if (!triggerExists) {
    console.log('❌ TESTY PRZERWANE: Trigger nie istnieje');
    console.log('💡 Uruchom najpierw migrację przez Supabase Dashboard\n');
    return;
  }

  // Test 2: Wstaw testowe powiadomienie
  const notificationId = await testNotificationInsert();
  
  if (!notificationId) {
    console.log('❌ TESTY PRZERWANE: Nie można wstawić powiadomienia\n');
    return;
  }

  // Test 3: Sprawdź status po czasie
  const processed = await checkNotificationStatus(notificationId);

  // Test 4: Informacje o logach
  await checkEdgeFunctionLogs();

  // Test 5: Ręczne wywołanie edge function (jeśli auto nie zadziałało)
  if (!processed) {
    console.log('🔧 Próba ręcznego wywołania Edge Function...\n');
    await testManualEdgeFunctionCall(notificationId);
    await wait(2000);
    await checkNotificationStatus(notificationId, 2);
  }

  // Cleanup
  await cleanup(notificationId);

  // Podsumowanie
  console.log('='.repeat(50));
  console.log('📊 PODSUMOWANIE TESTÓW');
  console.log('='.repeat(50));
  
  if (processed) {
    console.log('✅ System automatycznych powiadomień działa PRAWIDŁOWO');
    console.log('🎉 Trigger wywołuje edge function automatycznie');
  } else {
    console.log('⚠️  System wymaga uwagi:');
    console.log('   - Trigger może nie działać poprawnie');
    console.log('   - Sprawdź logi w Supabase Dashboard');
    console.log('   - Zweryfikuj konfigurację Service Role Key');
  }
  
  console.log('');
  console.log('📚 Następne kroki:');
  console.log('   1. Sprawdź logi w Supabase Dashboard > Logs');
  console.log('   2. Przeczytaj dokumentację: OPTYMALIZACJA_AUTO_NOTIFICATIONS.md');
  console.log('   3. Rozważ dodanie cron backup dla większej niezawodności');
  console.log('');
}

// Uruchom testy
runAllTests().catch(error => {
  console.error('❌ Krytyczny błąd:', error);
  process.exit(1);
});