/**
 * Sprawdzenie istnienia triggera auto_process_notifications w bazie danych
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 SPRAWDZANIE TRIGGERA AUTO_PROCESS_NOTIFICATIONS');
console.log('='.repeat(70));
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Błąd: Brak wymaganych zmiennych środowiskowych!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sprawdź czy tabela notifications istnieje
async function checkNotificationsTable() {
  console.log('📋 Krok 1: Sprawdzenie tabeli notifications');
  console.log('-'.repeat(70));
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Błąd odczytu tabeli:', error.message);
      return false;
    }
    
    console.log('✅ Tabela notifications istnieje i jest dostępna');
    return true;
  } catch (error) {
    console.log('❌ Krytyczny błąd:', error.message);
    return false;
  }
}

// Sprawdź strukturę tabeli notifications
async function checkTableStructure() {
  console.log('📋 Krok 2: Sprawdzenie struktury tabeli notifications');
  console.log('-'.repeat(70));
  
  try {
    // Sprawdź kolumny tabeli
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'notifications' });
    
    if (colError) {
      console.log('⚠️  Nie można sprawdzić kolumn przez RPC (to jest OK)');
      // Spróbuj innym sposobem
      const { data: sample, error: sampleError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log('❌ Błąd odczytu przykładowego rekordu:', sampleError.message);
        return;
      }
      
      if (sample && sample.length > 0) {
        console.log('✅ Dostępne kolumny:', Object.keys(sample[0]).join(', '));
      }
    } else {
      console.log('✅ Kolumny tabeli:', columns);
    }
  } catch (error) {
    console.log('❌ Błąd sprawdzania struktury:', error.message);
  }
}

// Sprawdź statystyki powiadomień
async function checkNotificationStats() {
  console.log('📋 Krok 3: Statystyki powiadomień');
  console.log('-'.repeat(70));
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('status, COUNT(*) as count')
      .group('status');
    
    if (error) {
      console.log('❌ Błąd agregacji:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('📊 Statystyki statusów:');
      data.forEach(stat => {
        console.log(`   ${stat.status}: ${stat.count}`);
      });
    }
    
    // Sprawdź ostatnie wpisy
    const { data: recent, error: recentError } = await supabase
      .from('notifications')
      .select('notification_id, status, recipient_email, created_at, error_message')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recentError) {
      console.log('❌ Błąd odczytu ostatnich wpisów:', recentError.message);
    } else if (recent && recent.length > 0) {
      console.log('');
      console.log('📝 Ostatnie powiadomienia:');
      recent.forEach(notif => {
        console.log(`   ${notif.notification_id}: ${notif.status} → ${notif.recipient_email}`);
        if (notif.error_message) {
          console.log(`      Błąd: ${notif.error_message}`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Błąd sprawdzania statystyk:', error.message);
  }
}

// Sprawdź funkcje w bazie danych
async function checkDatabaseFunctions() {
  console.log('📋 Krok 4: Sprawdzenie funkcji w bazie danych');
  console.log('-'.repeat(70));
  
  // Lista funkcji do sprawdzenia
  const functionsToCheck = [
    'auto_process_notifications',
    'process_pending_notifications'
  ];
  
  console.log('🔍 Szukam funkcji w bazie danych...');
  
  // Sprawdź funkcje poprzez zapytanie do information_schema
  try {
    const { data: functions, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_type', 'FUNCTION');
    
    if (error) {
      console.log('❌ Błąd sprawdzania funkcji:', error.message);
      console.log('⚠️  To może być OK - Supabase może ograniczać dostęp do information_schema');
    } else if (functions) {
      const functionNames = functions.map(f => f.routine_name.toLowerCase());
      
      functionsToCheck.forEach(funcName => {
        const found = functionNames.some(name => name.includes(funcName.toLowerCase()));
        if (found) {
          console.log(`✅ Znaleziono funkcję: ${funcName}`);
        } else {
          console.log(`❌ Brak funkcji: ${funcName}`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Błąd:', error.message);
  }
  
  console.log('');
  console.log('💡 UWAGA: Supabase może ograniczać dostęp do metadata funkcji');
  console.log('   Funkcja może istnieć, ale nie być widoczna w information_schema');
}

// Sprawdź triggery
async function checkTriggers() {
  console.log('📋 Krok 5: Sprawdzenie triggerów');
  console.log('-'.repeat(70));
  
  // Sprawdź triggery poprzez zapytanie do information_schema
  try {
    const { data: triggers, error } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_statement')
      .eq('event_object_table', 'notifications');
    
    if (error) {
      console.log('❌ Błąd sprawdzania triggerów:', error.message);
      console.log('⚠️  To może być OK - Supabase może ograniczać dostęp do triggerów');
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Znalezione triggery dla tabeli notifications:');
      triggers.forEach(trigger => {
        console.log(`   Trigger: ${trigger.trigger_name}`);
        console.log(`   SQL: ${trigger.action_statement?.substring(0, 100)}...`);
        console.log('');
      });
    } else {
      console.log('❌ Brak triggerów dla tabeli notifications');
    }
  } catch (error) {
    console.log('❌ Błąd sprawdzania triggerów:', error.message);
  }
  
  console.log('💡 UWAGA: Supabase może ograniczać dostęp do metadata triggerów');
}

// Test ręcznego wywołania procesowania
async function testManualProcessing() {
  console.log('📋 Krok 6: Test ręcznego wywołania process-pending-notifications');
  console.log('-'.repeat(70));
  
  try {
    console.log('📤 Wywołuję edge function ręcznie...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-pending-notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Pusty request
    });
    
    console.log('📊 Odpowiedź:', response.status);
    
    const result = await response.text();
    console.log('📄 Treść odpowiedzi:', result.substring(0, 500) + (result.length > 500 ? '...' : ''));
    
    if (response.ok) {
      console.log('✅ Edge function odpowiedziała poprawnie');
    } else {
      console.log('❌ Edge function zwróciła błąd');
    }
  } catch (error) {
    console.log('❌ Błąd wywołania edge function:', error.message);
  }
}

// Główna funkcja diagnostyczna
async function runDiagnostics() {
  const tableExists = await checkNotificationsTable();
  
  if (!tableExists) {
    console.log('');
    console.log('❌ Krytyczny błąd: Tabela notifications nie istnieje!');
    return;
  }
  
  await checkTableStructure();
  await checkNotificationStats();
  await checkDatabaseFunctions();
  await checkTriggers();
  await testManualProcessing();
  
  console.log('');
  console.log('='.repeat(70));
  console.log('💡 PODSUMOWANIE DIAGNOSTYKI');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. Sprawdź logi Edge Functions w Supabase Dashboard');
  console.log(`   https://app.wllxicmacmfzmqdnovhp.supabase.co/logs/edge-functions`);
  console.log('');
  console.log('2. Sprawdź czy migracja została zastosowana:');
  console.log('   supabase/migrations/20251210_setup_auto_notifications.sql');
  console.log('');
  console.log('3. Sprawdź Supabase Secrets:');
  console.log(`   https://app.wllxicmacmfzmqdnovhp.supabase.co/settings/functions`);
  console.log('');
  console.log('4. Sprawdź domenę w Resend:');
  console.log('   https://resend.com/domains');
  console.log('');
  console.log('✅ Diagnostyka triggera zakończona!');
}

runDiagnostics().catch(error => {
  console.error('❌ Krytyczny błąd diagnostyki:', error);
  process.exit(1);
});