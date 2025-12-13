// Skrypt do uruchomienia migracji konta administratora
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Utwórz klienta z uprawnieniami service_role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runAdminMigration() {
  try {
    console.log('🚀 Uruchamianie migracji konta administratora...');
    
    // Najpierw sprawdź czy funkcja exec_sql istnieje
    const { data: sqlFunction, error: sqlError } = await supabaseAdmin
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'exec_sql')
      .eq('routine_schema', 'public');
    
    if (sqlError) {
      console.log(`❌ Błąd sprawdzania funkcji exec_sql: ${sqlError.message}`);
      
      // Próba wykonania bezpośrednich zapytań SQL jeśli funkcja nie istnieje
      console.log('🔄 Próba bezpośredniego wykonania SQL...');
      
      // Usuń wszystkich adminów z profiles
      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('role', 'admin');
      
      if (deleteError && deleteError.code !== 'PGRST116') {
        console.log(`⚠️ Błąd usuwania adminów: ${deleteError.message}`);
      } else {
        console.log('✅ Usunięto poprzednich adminów');
      }
      
      // Sprawdź czy użytkownik admin@byteclinic.pl istnieje
      const { data: adminUser } = await supabaseAdmin.auth.admin.listUsers();
      const targetAdmin = adminUser.users.find(user => user.email === 'admin@byteclinic.pl');
      
      if (targetAdmin) {
        console.log(`✅ Znaleziono użytkownika admin@byteclinic.pl: ${targetAdmin.id}`);
        
        // Aktualizuj lub utwórz profil administratora
        const { error: upsertError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: targetAdmin.id,
            display_name: 'Administrator ByteClinic',
            role: 'admin'
          }, { 
            onConflict: 'id'
          });
        
        if (upsertError) {
          console.log(`❌ Błąd tworzenia profilu admin: ${upsertError.message}`);
        } else {
          console.log('✅ Profil administratora został utworzony/aktualizowany');
        }
      } else {
        console.log('❌ Nie znaleziono użytkownika admin@byteclinic.pl');
        console.log('📋 Dostępni użytkownicy:', adminUser.users.map(u => `${u.email} (${u.id})`));
      }
      
      // Sprawdź obecne polityki RLS
      const { data: policies } = await supabaseAdmin
        .from('pg_policies')
        .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
        .eq('schemaname', 'public')
        .in('tablename', ['profiles', 'reviews', 'notifications']);
      
      if (policies) {
        console.log('📋 Aktualne polityki RLS:');
        policies.forEach(policy => {
          console.log(`  ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
        });
      }
      
    } else {
      console.log('✅ Funkcja exec_sql istnieje, używam jej...');
      
      // Jeśli funkcja istnieje, użyj oryginalnego podejścia
      const migrationSQL = fs.readFileSync('./supabase/migrations/20251205_update_admin_account.sql', 'utf8');
      
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
        .join('; ');
      
      console.log('📝 Wykonywanie migracji SQL...');
      
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
            results.push({ statement, error: err });
          }
        }
      }
    }
    
    // Sprawdź rezultat końcowy
    console.log('\n🔍 Sprawdzanie końcowego rezultatu...');
    
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, role')
      .eq('role', 'admin');
    
    if (allProfiles) {
      console.log('👥 Konta administratora:');
      allProfiles.forEach(profile => {
        console.log(`  ${profile.display_name} (${profile.id.substring(0, 8)}...)`);
      });
    }
    
    console.log('\n🎉 Migracja konta administratora ukończona!');
    return { success: true };
    
  } catch (error) {
    console.error('💥 Błąd migracji:', error.message);
    return { success: false, error: error.message };
  }
}

// Uruchom migrację
runAdminMigration()
  .then(result => {
    console.log('\n📊 REZULTAT KOŃCOWY:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Krytyczny błąd:', error);
    process.exit(1);
  });
