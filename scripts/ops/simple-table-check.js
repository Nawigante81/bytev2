// Sprawdzenie czy tabela reviews istnieje
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  try {
    console.log('🔍 Sprawdzanie tabeli reviews...');
    
    // Próba pobrania danych z tabeli reviews
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Błąd: ${error.message}`);
      console.log(`📋 Kod błędu: ${error.code}`);
      
      // Sprawdźmy jakie tabele są dostępne
      console.log('\n📊 Sprawdzanie dostępnych tabel...');
      
      // Spróbujmy sprawdzić istniejące tabele przez funkcję
      const { data: functions, error: fnError } = await supabase
        .rpc('version');
      
      if (fnError) {
        console.log(`❌ Błąd sprawdzania funkcji: ${fnError.message}`);
      } else {
        console.log(`✅ Połączenie z bazą danych: ${functions}`);
      }
      
      return { success: false, error: error.message };
    } else {
      console.log(`✅ Tabela reviews istnieje!`);
      console.log(`📊 Pierwszy rekord:`, data);
      return { success: true, data };
    }
    
  } catch (err) {
    console.error('💥 Nieoczekiwany błąd:', err.message);
    return { success: false, error: err.message };
  }
}

checkTable().then(result => {
  console.log('\n📊 WYNIK KOŃCOWY:');
  console.log(JSON.stringify(result, null, 2));
});
