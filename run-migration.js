// Skrypt do uruchomienia migracji tabeli reviews
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU';

// Utwórz klienta z uprawnieniami service_role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  try {
    console.log('🚀 Uruchamianie migracji reviews...');
    
    // Przeczytaj plik migracji
    const migrationSQL = fs.readFileSync('./supabase/migrations/20251205_add_reviews_table.sql', 'utf8');
    
    // Podziel na osobne komendy SQL (usunąć komentarze na końcu)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .join('; ');
    
    console.log('📝 Wykonywanie migracji SQL...');
    
    // Wykonaj każdy statement osobno
    const results = [];
    for (const statement of statements.split('; ').filter(s => s.trim())) {
      if (statement.trim()) {
        try {
          const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.log(`⚠️ Uwaga przy wykonywaniu: ${error.message}`);
          } else {
            console.log(`✅ Wykonano: ${statement.substring(0, 50)}...`);
          }
          results.push({ statement, result: data, error });
        } catch (err) {
          console.log(`❌ Błąd dla statement: ${statement.substring(0, 50)}...`);
          console.log(`💥 Szczegóły błędu: ${err.message}`);
          results.push({ statement, error: err });
        }
      }
    }
    
    console.log('\n🔍 Sprawdzanie wyników migracji...');
    
    // Sprawdź czy tabela reviews została utworzona
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'reviews');
    
    if (tablesError) {
      console.log(`❌ Błąd sprawdzania tabel: ${tablesError.message}`);
    } else {
      console.log(`✅ Tabele w bazie danych:`, tables.map(t => t.table_name));
    }
    
    // Sprawdź czy typ enum został utworzony
    const { data: enums, error: enumError } = await supabaseAdmin
      .from('pg_type')
      .select('typname')
      .eq('typname', 'review_status');
    
    if (enumError) {
      console.log(`❌ Błąd sprawdzania typu enum: ${enumError.message}`);
    } else {
      console.log(`✅ Typy enum:`, enums.map(e => e.typname));
    }
    
    console.log('\n🎉 Migracja ukończona!');
    return { success: true, results, tables, enums };
    
  } catch (error) {
    console.error('💥 Błąd migracji:', error.message);
    return { success: false, error: error.message };
  }
}

// Uruchom migrację
runMigration()
  .then(result => {
    console.log('\n📊 REZULTAT KOŃCOWY:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Krytyczny błąd:', error);
    process.exit(1);
  });