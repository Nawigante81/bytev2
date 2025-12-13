// Sprawdzenie dokładnych kolumn tabeli bookings
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkExactBookingsColumns() {
    try {
        console.log('Sprawdzanie dokładnej struktury tabeli bookings...\n');
        
        // Spróbuj pobrać pierwszy rekord z tabeli, żeby zobaczyć jakie kolumny są dostępne
        console.log('Próba pobrania wszystkich dostępnych kolumn z bookings:');
        
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ Błąd:', error.message);
        } else if (bookings && bookings.length > 0) {
            console.log('✅ Dostępne kolumny w tabeli bookings:');
            const columns = Object.keys(bookings[0]);
            columns.forEach(col => {
                console.log(`  - ${col}: ${typeof bookings[0][col]} = "${bookings[0][col]}"`);
            });
        } else {
            console.log('ℹ️ Tabela bookings jest pusta, ale istnieje');
            
            // Spróbuj pobrać strukturę przez błąd - próbując różne kolumny systemowe
            console.log('\nSprawdzanie przez próby błędów:');
            const systemColumns = ['created_at', 'updated_at', 'id'];
            for (const col of systemColumns) {
                try {
                    const { data, error } = await supabase
                        .from('bookings')
                        .select(col)
                        .limit(1);
                    if (!error) {
                        console.log(`✅ Kolumna ${col} istnieje`);
                    }
                } catch (err) {
                    console.log(`❌ Kolumna ${col}: ${err.message}`);
                }
            }
        }

        // Sprawdź też tabelę customers
        console.log('\nSprawdzenie tabeli customers:');
        const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .limit(1);

        if (customerError) {
            console.log('❌ Tabela customers nie istnieje:', customerError.message);
        } else {
            console.log('✅ Tabela customers istnieje');
            if (customers && customers.length > 0) {
                const columns = Object.keys(customers[0]);
                console.log('Kolumny customers:', columns);
            }
        }

    } catch (err) {
        console.error('Nieoczekiwany błąd:', err);
    }
}

checkExactBookingsColumns();
