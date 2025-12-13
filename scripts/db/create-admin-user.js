// Tworzenie użytkownika administratora admin@byteclinic.pl
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

async function createAdminUser() {
  console.log('👤 Tworzenie użytkownika administratora...\n');
  
  try {
    // Test 1: Sprawdzenie czy użytkownik już istnieje
    console.log('📋 Test 1: Sprawdzenie istniejących użytkowników');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUsers.users.find(user => user.email === 'admin@byteclinic.pl');
    
    if (adminExists) {
      console.log(`✅ Użytkownik admin@byteclinic.pl już istnieje: ${adminExists.id}`);
      console.log('🔄 Sprawdzanie profilu administratora...');
      
      // Sprawdź profil
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', adminExists.id)
        .maybeSingle();
      
      if (profile && profile.role === 'admin') {
        console.log('✅ Administrator ma już poprawną rolę');
        return;
      } else {
        console.log('🔄 Aktualizacja roli administratora...');
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: adminExists.id,
            full_name: 'Administrator ByteClinic',
            role: 'admin'
          }, { onConflict: 'id' });
        
        if (updateError) {
          console.log(`❌ Błąd aktualizacji profilu: ${updateError.message}`);
        } else {
          console.log('✅ Rola administratora została zaktualizowana');
        }
        return;
      }
    }
    
    // Test 2: Tworzenie nowego użytkownika administratora
    console.log('\n📋 Test 2: Tworzenie nowego użytkownika administratora');
    
    // Najpierw spróbuj utworzyć w auth.users
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@byteclinic.pl',
      password: 'ByteClinic2025!', // Silne hasło
      email_confirm: true
    });
    
    if (createUserError) {
      console.log(`❌ Błąd tworzenia użytkownika: ${createUserError.message}`);
      console.log('💡 Sprawdzanie czy to nie jest konflikt email...');
      
      // Sprawdź czy użytkownik z tym emailem istnieje ale został usunięty
      console.log('🔍 Sprawdzanie usuniętych użytkowników...');
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
      const deletedAdmin = allUsers.users.find(user => 
        user.email === 'admin@byteclinic.pl' && user.deleted_at
      );
      
      if (deletedAdmin) {
        console.log(`📋 Znaleziono usuniętego użytkownika: ${deletedAdmin.id}`);
        console.log('💡 Ten użytkownik zostanie automatycznie usunięty z systemu auth');
        // Nie możemy bezpośrednio usunąć z auth, więc kontynuujemy z istniejącymi
      }
      
      // Sprawdź czy istnieją inni użytkownicy
      console.log(`📋 Dostępni użytkownicy (${allUsers.users.length}):`);
      allUsers.users.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) - ${user.deleted_at ? 'USUNIĘTY' : 'AKTYWNY'}`);
      });
      
      return;
    }
    
    if (!newUser.user) {
      console.log('❌ Błąd: Nie otrzymano danych użytkownika');
      return;
    }
    
    console.log(`✅ Użytkownik został utworzony: ${newUser.user.email} (${newUser.user.id})`);
    
    // Test 3: Tworzenie profilu administratora
    console.log('\n📋 Test 3: Tworzenie profilu administratora');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        full_name: 'Administrator ByteClinic',
        role: 'admin'
      }, { onConflict: 'id' });
    
    if (profileError) {
      console.log(`❌ Błąd tworzenia profilu: ${profileError.message}`);
      return;
    }
    
    console.log('✅ Profil administratora został utworzony');
    
    // Test 4: Weryfikacja końcowa
    console.log('\n📋 Test 4: Weryfikacja końcowa');
    const { data: finalProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single();
    
    console.log(`📋 Końcowy profil administratora:`);
    console.log(`  - ID: ${finalProfile.id}`);
    console.log(`  - Nazwa: ${finalProfile.full_name}`);
    console.log(`  - Rola: ${finalProfile.role}`);
    console.log(`  - Email: ${newUser.user.email}`);
    
    console.log('\n🎉 UŻYTKOWNIK ADMINISTRATORA ZOSTAŁ UTWORZONY!');
    console.log('===========================================');
    console.log('Email: admin@byteclinic.pl');
    console.log('Hasło: ByteClinic2025!');
    console.log('Rola: admin');
    console.log('Panel: /admin/uzytkownicy');
    
  } catch (error) {
    console.error('💥 Błąd tworzenia administratora:', error.message);
  }
}

// Uruchom tworzenie
createAdminUser();
