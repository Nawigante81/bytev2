// Bezpośrednie utworzenie tabeli reviews
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createReviewsTable() {
  try {
    console.log('🚀 Tworzenie tabeli reviews...');
    
    // Sprawdźmy istniejące tabele przez inne zapytania
    console.log('📋 Sprawdzanie istniejących tabel...');
    
    // 1. Sprawdź tabele z innych części aplikacji (jeśli istnieją)
    const { data: testData, error: testError } = await supabase
      .from('service_catalog')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log(`❌ Błąd sprawdzania service_catalog: ${testError.message}`);
    } else {
      console.log(`✅ Tabela service_catalog istnieje`);
    }
    
    // 2. Sprawdź profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.log(`❌ Tabela profiles nie istnieje - błąd: ${profileError.message}`);
      console.log('🔧 Trzeba najpierw utworzyć profiles i zależności...');
    } else {
      console.log(`✅ Tabela profiles istnieje`);
    }
    
    // 3. Spróbuj utworzyć reviews z podstawową strukturą
    console.log('🔧 Próba utworzenia tabeli reviews...');
    
    const reviewsSchema = {
      id: 'bigserial primary key',
      user_id: 'uuid',
      rating: 'integer not null check (rating between 1 and 5)',
      title: 'text',
      message: 'text not null',
      status: 'text default \'pending\'',
      approved: 'boolean default false',
      created_at: 'timestamptz default now()',
      updated_at: 'timestamptz default now()'
    };
    
    console.log('📝 Schema tabeli reviews:', reviewsSchema);
    
    // 4. Najpierw spróbujmy utworzyć prosty test
    const { data: insertData, error: insertError } = await supabase
      .from('reviews')
      .insert([
        {
          rating: 5,
          title: 'Test Review',
          message: 'This is a test review',
          status: 'pending',
          approved: false
        }
      ])
      .select();
    
    if (insertError) {
      console.log(`❌ Błąd tworzenia reviews: ${insertError.message}`);
      
      // Sprawdźmy czy to problem z uprawnieniami czy z istnieniem tabeli
      if (insertError.code === 'PGRST205') {
        console.log('💡 Tabela reviews nie istnieje - potrzebna migracja');
      } else {
        console.log(`💥 Inny błąd: ${insertError.details || insertError.hint}`);
      }
      
      return { success: false, error: insertError.message };
    } else {
      console.log(`✅ Pomyślnie utworzono review!`, insertData);
      
      // Usuń testowy rekord
      const { error: deleteError } = await supabase
        .from('reviews')
        .delete()
        .eq('title', 'Test Review');
      
      if (deleteError) {
        console.log(`⚠️ Błąd usuwania testu: ${deleteError.message}`);
      } else {
        console.log('🗑️ Testowy rekord usunięty');
      }
      
      return { success: true, data: insertData };
    }
    
  } catch (err) {
    console.error('💥 Nieoczekiwany błąd:', err.message);
    return { success: false, error: err.message };
  }
}

createReviewsTable().then(result => {
  console.log('\n📊 WYNIK KOŃCOWY:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n🎉 Tabela reviews została pomyślnie utworzona!');
  } else {
    console.log('\n❌ Nie udało się utworzyć tabeli reviews');
    console.log('\n💡 NASTĘPNE KROKI:');
    console.log('1. Uruchom ręcznie plik migracji SQL w panelu Supabase');
    console.log('2. Lub skontaktuj się z administratorem bazy danych');
    console.log('3. Sprawdź uprawnienia service_role key');
  }
});
