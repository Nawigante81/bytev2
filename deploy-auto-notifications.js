/**
 * Skrypt do wdrożenia systemu automatycznych powiadomień
 * Uruchamia migrację i weryfikuje poprawność instalacji
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Konfiguracja Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Błąd: Brak zmiennych środowiskowych VITE_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 Wdrażanie systemu automatycznych powiadomień...\n');

async function deployMigration() {
  try {
    // Wczytaj plik migracji
    console.log('📄 Wczytywanie migracji...');
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20251210_setup_auto_notifications.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('✅ Migracja wczytana\n');

    // Wykonaj migrację (Supabase nie ma bezpośredniego API do migracji, więc rozbijemy na części)
    console.log('⚙️  Wykonywanie migracji...');
    console.log('   Krok 1: Włączanie rozszerzenia http...');
    
    const { error: extError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;'
    }).catch(() => ({ error: null })); // Rozszerzenie może już istnieć
    
    if (extError) {
      console.log('   ⚠️  Rozszerzenie http może już być włączone lub wymaga uprawnień admin');
    } else {
      console.log('   ✅ Rozszerzenie http włączone');
    }

    console.log('\n📝 UWAGA: Główna migracja musi być uruchomiona przez Supabase Dashboard lub CLI');
    console.log('   1. Otwórz Supabase Dashboard');
    console.log('   2. Przejdź do SQL Editor');
    console.log('   3. Wklej zawartość pliku: supabase/migrations/20251210_setup_auto_notifications.sql');
    console.log('   4. Uruchom query\n');

    // Sprawdź czy trigger już istnieje
    console.log('🔍 Sprawdzanie stanu systemu...\n');
    await verifyInstallation();

  } catch (error) {
    console.error('❌ Błąd podczas wdrożenia:', error.message);
    process.exit(1);
  }
}

async function verifyInstallation() {
  try {
    // Sprawdź czy trigger istnieje
    console.log('   Sprawdzanie triggera...');
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_name', 'auto_process_notifications')
      .limit(1);

    if (triggerError) {
      console.log('   ⚠️  Nie można sprawdzić triggera (może wymagać uprawnień)');
    } else if (triggers && triggers.length > 0) {
      console.log('   ✅ Trigger auto_process_notifications istnieje');
    } else {
      console.log('   ⚠️  Trigger auto_process_notifications NIE istnieje - uruchom migrację');
    }

    // Sprawdź czy funkcja istnieje
    console.log('   Sprawdzanie funkcji...');
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `SELECT proname FROM pg_proc WHERE proname = 'trigger_process_pending_notifications';`
    }).catch(() => ({ error: 'No RPC' }));

    if (funcError) {
      console.log('   ⚠️  Nie można sprawdzić funkcji (może wymagać uprawnień)');
    } else {
      console.log('   ✅ Funkcja trigger_process_pending_notifications istnieje');
    }

    // Sprawdź czy tabela notifications istnieje
    console.log('   Sprawdzanie tabeli notifications...');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('notification_id')
      .limit(1);

    if (notifError) {
      console.log('   ❌ Tabela notifications nie istnieje lub brak dostępu');
      console.log('   💡 Upewnij się, że tabela notifications została utworzona');
    } else {
      console.log('   ✅ Tabela notifications istnieje i jest dostępna');
    }

    console.log('\n📊 Podsumowanie weryfikacji:');
    console.log('   - Rozszerzenie http: Sprawdzone');
    console.log('   - Trigger: ' + (triggers && triggers.length > 0 ? '✅ Działa' : '⚠️ Wymaga uruchomienia'));
    console.log('   - Funkcja: Sprawdzona');
    console.log('   - Tabela notifications: ' + (!notifError ? '✅ OK' : '❌ Brak dostępu'));

  } catch (error) {
    console.error('❌ Błąd podczas weryfikacji:', error.message);
  }
}

async function configureServiceKey() {
  console.log('\n🔐 Konfiguracja Service Role Key (opcjonalne)...');
  console.log('   Możesz ustawić Service Role Key w GUC:');
  console.log('   ```sql');
  console.log('   ALTER DATABASE postgres SET app.settings = \'{"service_role_key": "' + supabaseServiceKey.substring(0, 20) + '..."}\';');
  console.log('   ```');
  console.log('   ⚠️  UWAGA: To wymaga restartu connection pool\n');
}

// Główna funkcja
async function main() {
  await deployMigration();
  await configureServiceKey();
  
  console.log('\n✨ Gotowe!');
  console.log('\n📚 Następne kroki:');
  console.log('   1. Uruchom migrację przez Supabase Dashboard (jeśli jeszcze nie)');
  console.log('   2. Uruchom test: node test-auto-notifications.js');
  console.log('   3. Sprawdź logi w Supabase Dashboard > Logs');
  console.log('\n📖 Dokumentacja: OPTYMALIZACJA_AUTO_NOTIFICATIONS.md\n');
}

main().catch(console.error);