// Naprawa uprawnień administratora i utworzenie systemu zarządzania użytkownikami
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixAdminPermissions() {
  console.log('🔧 Naprawa uprawnień administratora...\n');
  
  try {
    // Test 1: Sprawdzenie użytkownika admin@byteclinic.pl
    console.log('📋 Test 1: Sprawdzenie użytkownika admin@byteclinic.pl');
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = allUsers.users.find(user => user.email === 'admin@byteclinic.pl');
    
    if (!adminUser) {
      console.log('❌ Użytkownik admin@byteclinic.pl nie istnieje!');
      return;
    }
    
    console.log(`✅ Znaleziono użytkownika: ${adminUser.email} (${adminUser.id})`);
    
    // Test 2: Sprawdzenie i naprawa profilu administratora
    console.log('\n📋 Test 2: Sprawdzenie profilu administratora');
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.log(`❌ Błąd odczytu profilu: ${profileError.message}`);
      return;
    }
    
    if (!adminProfile) {
      console.log('🔄 Tworzenie profilu administratora...');
      const { error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: adminUser.id,
          full_name: 'Administrator ByteClinic',
          role: 'admin'
        });
      
      if (createError) {
        console.log(`❌ Błąd tworzenia profilu: ${createError.message}`);
        return;
      }
      console.log('✅ Profil administratora został utworzony');
    } else {
      console.log(`📋 Obecny profil: rola = ${adminProfile.role}`);
      
      if (adminProfile.role !== 'admin') {
        console.log('🔄 Aktualizacja roli na administrator...');
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            role: 'admin',
            full_name: 'Administrator ByteClinic'
          })
          .eq('id', adminUser.id);
        
        if (updateError) {
          console.log(`❌ Błąd aktualizacji profilu: ${updateError.message}`);
          return;
        }
        console.log('✅ Rola została zaktualizowana na administrator');
      } else {
        console.log('✅ Profil ma już rolę administrator');
      }
    }
    
    // Test 3: Sprawdzenie końcowego stanu
    console.log('\n📋 Test 3: Sprawdzenie końcowego stanu');
    const { data: finalAdminProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single();
    
    console.log(`📋 Końcowy profil administratora:`);
    console.log(`  - ID: ${finalAdminProfile.id}`);
    console.log(`  - Nazwa: ${finalAdminProfile.full_name || 'Brak'}`);
    console.log(`  - Rola: ${finalAdminProfile.role}`);
    
    // Test 4: Sprawdzenie wszystkich profili w systemie
    console.log('\n📋 Test 4: Wszystkie profile w systemie');
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at');
    
    const adminCount = allProfiles?.filter(p => p.role === 'admin').length || 0;
    const userCount = allProfiles?.filter(p => p.role === 'user').length || 0;
    
    console.log(`📋 Statystyki profili:`);
    console.log(`  - Administratorzy: ${adminCount}`);
    console.log(`  - Użytkownicy: ${userCount}`);
    console.log(`  - Łącznie: ${allProfiles?.length || 0}`);
    
    if (adminCount === 0) {
      console.log('❌ BŁĄD: Brak administratorów w systemie!');
    } else {
      console.log('✅ System ma administratora');
    }
    
    // Test 5: Przygotowanie do utworzenia systemu zarządzania
    console.log('\n📋 Test 5: Przygotowanie systemu zarządzania uprawnieniami');
    console.log('✅ Uprawnienia administratora zostały naprawione');
    console.log('💡 Następny krok: Panel do zarządzania uprawnieniami użytkowników');
    
    console.log('\n🎉 Naprawa uprawnień administratora ukończona!');
    
  } catch (error) {
    console.error('💥 Błąd naprawy:', error.message);
  }
}

// Uruchom naprawę
fixAdminPermissions();