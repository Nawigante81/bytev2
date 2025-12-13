// Sprawdzenie struktury tabeli bookings
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBookingsTable() {
    try {
        console.log('Sprawdzanie tabeli bookings...\n');
        
        // Sprawdź czy tabela istnieje
        console.log('Test 1: Sprawdzenie czy tabela bookings istnieje');
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .limit(1);

        if (bookingsError) {
            console.log('❌ Błąd z tabelą bookings:', bookingsError.message);
            console.log('To oznacza, że tabela bookings nie istnieje lub nie jest dostępna');
        } else {
            console.log('✅ Tabela bookings istnieje');
        }

        // Sprawdź strukturę tabeli poprzez próbę różnych kolumn
        console.log('\nTest 2: Próba pobrania danych z różnymi kolumnami');
        
        const testColumns = [
            'id', 'booking_id', 'customer_name', 'customer_email', 'customer_phone',
            'service_type', 'service_name', 'device_type', 'booking_date', 'booking_time',
            'duration_minutes', 'price', 'status', 'notes'
        ];

        for (const column of testColumns) {
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select(column)
                    .limit(1);

                if (error) {
                    console.log(`❌ Kolumna ${column}: ${error.message}`);
                } else {
                    console.log(`✅ Kolumna ${column}: dostępna`);
                }
            } catch (err) {
                console.log(`❌ Kolumna ${column}: wyjątek - ${err.message}`);
            }
        }

        // Sprawdź wszystkie tabele związane z booking
        console.log('\nTest 3: Sprawdzenie tabel związanych z booking');
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .like('table_name', '%booking%');

        if (tablesError) {
            console.log('❌ Błąd pobierania tabel:', tablesError.message);
        } else {
            console.log('✅ Tabele z "booking" w nazwie:', tables?.map(t => t.table_name));
        }

    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
    }
}

checkBookingsTable();
