// Skrypt do sprawdzenia struktury tabeli profiles i utworzenia profilu administratora
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

async function createAdminProfile() {
  try {
    console.log('🔍 Sprawdzanie struktury tabeli profiles...');
    
    // Sprawdź obecną strukturę tabeli profiles
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.log(`❌ Błąd sprawdzania tabeli profiles: ${columnsError.message}`);
      
      // Próba sprawdzenia tabel bezpośrednio
      console.log('🔄 Próba utworzenia minimalnego profilu...');
    } else {
      console.log('✅ Tabela profiles istnieje');
      console.log(`📋 Przykładowy rekord:`, columns?.[0] || 'brak rekordów');
    }
    
    // Znajdź użytkownika admin@byteclinic.pl
    console.log('\n👤 Wyszukiwanie użytkownika admin@byteclinic.pl...');
    const { data: adminUser } = await supabaseAdmin.auth.admin.listUsers();
    const targetAdmin = adminUser.users.find(user => user.email === 'admin@byteclinic.pl');
    
    if (!targetAdmin) {
      console.log('❌ Nie znaleziono użytkownika admin@byteclinic.pl');
      return;
    }
    
    console.log(`✅ Znaleziono użytkownika: ${targetAdmin.email} (${targetAdmin.id})`);
    
    // Sprawdź czy istnieje już profil
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetAdmin.id)
      .maybeSingle();
    
    if (existingProfile) {
      console.log(`📋 Istniejący profil:`, existingProfile);
      
      // Aktualizuj rolę na admin
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', targetAdmin.id);
      
      if (updateError) {
        console.log(`❌ Błąd aktualizacji profilu: ${updateError.message}`);
      } else {
        console.log('✅ Zaktualizowano rolę na admin');
      }
    } else {
      console.log('🔄 Tworzenie nowego profilu administratora...');
      
      // Utwórz minimalny profil z podstawowymi polami
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: targetAdmin.id,
          role: 'admin'
        });
      
      if (insertError) {
        console.log(`❌ Błąd tworzenia profilu: ${insertError.message}`);
      } else {
        console.log('✅ Utworzono profil administratora');
      }
    }
    
    // Sprawdź końcowy rezultat
    console.log('\n🔍 Sprawdzanie końcowego rezultatu...');
    
    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, role, created_at')
      .eq('role', 'admin');
    
    if (adminProfiles) {
      console.log('👥 Konta administratora:');
      adminProfiles.forEach(profile => {
        console.log(`  ID: ${profile.id} (${profile.created_at})`);
      });
    }
    
    // Sprawdź czy użytkownik może się zalogować jako admin
    console.log('\n🧪 Test logowania administratora...');
    
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: 'admin@byteclinic.pl'
      });
      console.log('✅ Link uwierzytelniania wygenerowany pomyślnie');
    } catch (authError) {
      console.log(`⚠️ Ostrzeżenie dotyczące uwierzytelniania: ${authError.message}`);
    }
    
    console.log('\n🎉 Proces aktualizacji konta administratora ukończony!');
    
  } catch (error) {
    console.error('💥 Błąd:', error.message);
  }
}

// Uruchom proces
createAdminProfile();
