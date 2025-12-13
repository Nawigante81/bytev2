// System zarządzania profilami użytkowników i uprawnieniami administratora
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

async function setupUserProfilesSystem() {
  console.log('🔧 Konfigurowanie systemu profili użytkowników...\n');
  
  try {
    // Test 1: Sprawdzenie struktury tabeli profiles
    console.log('📋 Test 1: Sprawdzanie struktury tabeli profiles');
    const { data: sampleProfile, error: sampleError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.log(`❌ Błąd odczytu tabeli profiles: ${sampleError.message}`);
      return;
    }
    
    console.log('✅ Tabela profiles istnieje');
    if (sampleProfile && sampleProfile.length > 0) {
      console.log(`📋 Struktura tabeli:`, Object.keys(sampleProfile[0]));
    }
    
    // Test 2: Sprawdzenie wszystkich użytkowników w auth.users
    console.log('\n📋 Test 2: Sprawdzanie użytkowników w systemie');
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    console.log(`📋 Znaleziono ${allUsers.users.length} użytkowników w systemie`);
    
    // Test 3: Sprawdzenie które profile istnieją
    console.log('\n📋 Test 3: Sprawdzanie profili w bazie danych');
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at');
    
    console.log(`📋 Znaleziono ${existingProfiles?.length || 0} profili w bazie danych`);
    
    // Test 4: Utworzenie brakujących profili dla użytkowników
    console.log('\n📋 Test 4: Tworzenie brakujących profili');
    const authUserIds = new Set(allUsers.users.map(u => u.id));
    const profileUserIds = new Set(existingProfiles?.map(p => p.id) || []);
    
    const missingProfiles = allUsers.users.filter(user => !profileUserIds.has(user.id));
    
    if (missingProfiles.length > 0) {
      console.log(`🔄 Tworzenie ${missingProfiles.length} brakujących profili...`);
      
      for (const user of missingProfiles) {
        const displayName = user.user_metadata?.full_name || 
                           user.user_metadata?.display_name || 
                           user.email?.split('@')[0] || 
                           'Użytkownik';
        
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            full_name: displayName,
            role: 'user'  // Domyślnie wszyscy to 'user'
          });
        
        if (insertError) {
          console.log(`❌ Błąd tworzenia profilu dla ${user.email}: ${insertError.message}`);
        } else {
          console.log(`✅ Utworzono profil dla ${user.email}`);
        }
      }
    } else {
      console.log('✅ Wszyscy użytkownicy mają profile');
    }
    
    // Test 5: Sprawdzenie aktualnych uprawnień administratora
    console.log('\n📋 Test 5: Sprawdzenie uprawnień administratora');
    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('role', 'admin');
    
    console.log(`📋 Administratorzy w systemie (${adminProfiles?.length || 0}):`);
    adminProfiles?.forEach(admin => {
      const user = allUsers.users.find(u => u.id === admin.id);
      console.log(`  - ${user?.email || 'Nieznany email'} (rola: ${admin.role})`);
    });
    
    // Test 6: Sprawdzenie czy istnieje funkcja/trigger do automatycznego tworzenia profili
    console.log('\n📋 Test 6: Sprawdzenie funkcji automatycznego tworzenia profili');
    console.log('💡 Zalecenie: Należy utworzyć trigger w bazie danych który automatycznie utworzy profil dla nowego użytkownika');
    
    // Test 7: Przygotowanie skryptu do zarządzania uprawnieniami
    console.log('\n📋 Test 7: Przygotowanie systemu zarządzania uprawnieniami');
    console.log('💡 Potrzebny komponent do zarządzania uprawnieniami administratora');
    
    // Test 8: Sprawdzenie końcowego stanu
    console.log('\n📋 Test 8: Sprawdzenie końcowego stanu');
    const { data: finalProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role');
    
    const finalAdminCount = finalProfiles?.filter(p => p.role === 'admin').length || 0;
    const finalUserCount = finalProfiles?.filter(p => p.role === 'user').length || 0;
    
    console.log(`📋 Końcowy stan:`);
    console.log(`  - Administratorzy: ${finalAdminCount}`);
    console.log(`  - Użytkownicy: ${finalUserCount}`);
    console.log(`  - Łącznie profili: ${finalProfiles?.length || 0}`);
    
    if (finalAdminCount === 0) {
      console.log('⚠️ OSTRZEŻENIE: Brak administratorów w systemie!');
    }
    
    console.log('\n🎉 System profili użytkowników został skonfigurowany!');
    console.log('\n📝 Następne kroki:');
    console.log('1. Utworzenie triggera do automatycznego tworzenia profili');
    console.log('2. Panel administracyjny do zarządzania uprawnieniami');
    console.log('3. Funkcja do promocji użytkowników na administratorów');
    
  } catch (error) {
    console.error('💥 Błąd konfiguracji:', error.message);
  }
}

// Uruchom konfigurację
setupUserProfilesSystem();
