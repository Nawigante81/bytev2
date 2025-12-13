// Debug problemu z rolą administratora
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function debugAdminRole() {
  console.log('🔍 Debug problemu z rolą administratora...\n');
  
  try {
    // Test 1: Sprawdzenie struktury tabeli profiles
    console.log('📋 Test 1: Sprawdzanie struktury tabeli profiles');
    const { data: profileSample, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.log(`❌ Błąd odczytu tabeli profiles: ${profileError.message}`);
      console.log('🔍 Próba sprawdzenia tabel bezpośrednio...');
      
      // Sprawdź jakie tabele istnieją
      const { data: tables } = await supabaseAdmin
        .from('auth.users')
        .select('id, email')
        .eq('email', 'admin@byteclinic.pl');
      
      if (tables && tables.length > 0) {
        console.log(`✅ Użytkownik admin@byteclinic.pl istnieje w auth.users`);
        console.log(`📋 ID: ${tables[0].id}`);
      } else {
        console.log(`❌ Użytkownik admin@byteclinic.pl nie istnieje w auth.users`);
      }
    } else {
      console.log('✅ Tabela profiles istnieje');
      console.log(`📋 Przykładowy profil:`, profileSample?.[0] || 'brak danych');
    }
    
    // Test 2: Sprawdzenie użytkownika admin@byteclinic.pl
    console.log('\n📋 Test 2: Sprawdzenie użytkownika admin@byteclinic.pl');
    const { data: adminUser } = await supabaseAdmin.auth.admin.listUsers();
    const targetAdmin = adminUser.users.find(user => user.email === 'admin@byteclinic.pl');
    
    if (!targetAdmin) {
      console.log('❌ Użytkownik admin@byteclinic.pl nie istnieje!');
      return;
    }
    
    console.log(`✅ Użytkownik znaleziony: ${targetAdmin.email} (${targetAdmin.id})`);
    
    // Test 3: Sprawdzenie profilu dla konkretnego użytkownika
    console.log('\n📋 Test 3: Sprawdzenie profilu dla admin@byteclinic.pl');
    const { data: adminProfile, error: profileReadError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetAdmin.id)
      .maybeSingle();
    
    if (profileReadError) {
      console.log(`❌ Błąd odczytu profilu: ${profileReadError.message}`);
      
      // Spróbuj utworzyć profil z podstawowymi polami
      console.log('🔄 Próba utworzenia profilu administratora...');
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: targetAdmin.id,
          role: 'admin'
        });
      
      if (insertError) {
        console.log(`❌ Błąd tworzenia profilu: ${insertError.message}`);
        
        // Spróbuj tylko z id
        const { error: simpleInsertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: targetAdmin.id
          });
        
        if (simpleInsertError) {
          console.log(`❌ Błąd prostego tworzenia profilu: ${simpleInsertError.message}`);
          console.log('🔍 Sprawdzenie jakie kolumny ma tabela profiles...');
          
          // Sprawdź minimalne informacje
          try {
            const { data: basicCheck } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .limit(1);
            console.log(`📋 Podstawowe sprawdzenie przeszło: ${basicCheck ? 'TAK' : 'NIE'}`);
          } catch (e) {
            console.log(`❌ Nawet podstawowe sprawdzenie nie działa: ${e.message}`);
          }
        } else {
          console.log('✅ Utworzono profil z minimalnymi danymi');
        }
      } else {
        console.log('✅ Utworzono profil administratora');
      }
    } else {
      console.log(`📋 Istniejący profil:`, adminProfile);
      
      if (adminProfile && adminProfile.role !== 'admin') {
        console.log(`🔄 Aktualizacja roli z ${adminProfile.role} na admin...`);
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', targetAdmin.id);
        
        if (updateError) {
          console.log(`❌ Błąd aktualizacji roli: ${updateError.message}`);
        } else {
          console.log('✅ Zaktualizowano rolę na admin');
        }
      } else if (adminProfile && adminProfile.role === 'admin') {
        console.log('✅ Rola admin już jest poprawnie ustawiona');
      }
    }
    
    // Test 4: Sprawdzenie wszystkich profili
    console.log('\n📋 Test 4: Sprawdzenie wszystkich profili');
    const { data: allProfiles, error: allProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role');
    
    if (allProfilesError) {
      console.log(`❌ Błąd odczytu wszystkich profili: ${allProfilesError.message}`);
    } else {
      console.log(`📋 Wszystkie profile (${allProfiles?.length || 0}):`);
      allProfiles?.forEach(profile => {
        console.log(`  - ${profile.id} (rola: ${profile.role || 'BRAK'})`);
      });
    }
    
    // Test 5: Sprawdzenie routingu
    console.log('\n📋 Test 5: Sprawdzenie routingu aplikacji');
    console.log('📋 Sprawdź czy routing jest poprawnie skonfigurowany w App.jsx');
    console.log('🔗 Oczekiwane ścieżki:');
    console.log('  - /admin/moderacja -> AdminModeration');
    console.log('  - /admin/tickets -> AdminTickets');
    console.log('  - /admin/uslugi -> AdminServices');
    
    console.log('\n🎉 Debug zakończony!');
    
  } catch (error) {
    console.error('💥 Błąd debug:', error.message);
  }
}

// Uruchom debug
debugAdminRole();
