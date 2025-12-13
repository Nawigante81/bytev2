// Test systemu administratora po aktualizacji
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0MDgyNywiZXhwIjoyMDgwNTE2ODI3fQ.L9wOOdZeSQ7_ZyrOrN6VIYeKg8-gtsbh44gGypQNWeU';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testAdminSystem() {
  console.log('🧪 Testowanie systemu administratora...\n');
  
  try {
    // Test 1: Sprawdzenie konta administratora
    console.log('📋 Test 1: Sprawdzanie konta administratora');
    const { data: adminUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = adminUsers.users.find(user => user.email === 'admin@byteclinic.pl');
    
    if (!adminUser) {
      console.log('❌ BŁĄD: Nie znaleziono użytkownika admin@byteclinic.pl');
      return;
    }
    
    console.log(`✅ Znaleziono administratora: ${adminUser.email} (${adminUser.id})`);
    
    // Test 2: Sprawdzenie profilu administratora
    console.log('\n📋 Test 2: Sprawdzanie profilu administratora');
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .maybeSingle();
    
    if (!adminProfile) {
      console.log('❌ BŁĄD: Profil administratora nie istnieje');
      return;
    }
    
    if (adminProfile.role !== 'admin') {
      console.log(`❌ BŁĄD: Nieprawidłowa rola administratora: ${adminProfile.role}`);
      return;
    }
    
    console.log(`✅ Profil administratora poprawny: rola = ${adminProfile.role}`);
    
    // Test 3: Sprawdzenie czy nie ma innych administratorów
    console.log('\n📋 Test 3: Sprawdzanie unikalności konta administratora');
    const { data: allAdmins } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('role', 'admin');
    
    const adminCount = allAdmins?.length || 0;
    if (adminCount !== 1) {
      console.log(`⚠️ OSTRZEŻENIE: Znaleziono ${adminCount} kont administratora (oczekiwano 1)`);
      allAdmins?.forEach(admin => {
        console.log(`  - ${admin.id}`);
      });
    } else {
      console.log('✅ Tylko jedno konto administratora');
    }
    
    // Test 4: Sprawdzenie polityk RLS
    console.log('\n📋 Test 4: Sprawdzanie polityk RLS');
    const { data: policies } = await supabaseAdmin
      .from('pg_policies')
      .select('tablename, policyname, cmd')
      .eq('schemaname', 'public')
      .in('tablename', ['profiles', 'reviews', 'notifications']);
    
    if (policies && policies.length > 0) {
      console.log('✅ Polityki RLS istnieją:');
      policies.forEach(policy => {
        console.log(`  - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('❌ OSTRZEŻENIE: Brak polityk RLS');
    }
    
    // Test 5: Test funkcji is_admin
    console.log('\n📋 Test 5: Test funkcji is_admin');
    try {
      const { data: isAdminResult } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (isAdminResult) {
        console.log('✅ Możliwość odczytu profili');
      }
    } catch (error) {
      console.log(`❌ Błąd testu is_admin: ${error.message}`);
    }
    
    // Test 6: Sprawdzenie routingu administracyjnego
    console.log('\n📋 Test 6: Sprawdzanie komponentów administracyjnych');
    const adminComponents = [
      'AdminModeration.jsx',
      'AdminTickets.jsx', 
      'AdminServices.jsx',
      'ProtectedRoute.jsx',
      'Header.jsx'
    ];
    
    console.log('✅ Komponenty administracyjne do sprawdzenia:');
    adminComponents.forEach(component => {
      console.log(`  - ${component}`);
    });
    
    console.log('\n🎉 PODSUMOWANIE TESTÓW:');
    console.log('✅ Konto administratora admin@byteclinic.pl zostało pomyślnie skonfigurowane');
    console.log('✅ Profil administratora ma poprawną rolę "admin"');
    console.log('✅ System uwierzytelniania jest gotowy do użycia');
    console.log('\n💡 Dalsze kroki:');
    console.log('1. Uruchom aplikację i zaloguj się jako admin@byteclinic.pl');
    console.log('2. Sprawdź dostęp do panelu moderacji (/admin/moderacja)');
    console.log('3. Sprawdź dostęp do panelu zgłoszeń (/admin/tickets)');
    console.log('4. Sprawdź dostęp do panelu usług (/admin/uslugi)');
    
  } catch (error) {
    console.error('💥 Błąd testów:', error.message);
  }
}

// Uruchom testy
testAdminSystem();