// Test naprawionej funkcji create-booking
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreateBookingFunction() {
    try {
        console.log('Test funkcji create-booking...\n');
        
        const bookingData = {
            bookingId: `test-${Date.now()}`,
            name: 'Jan Kowalski',
            email: 'test@example.com',
            phone: '+48123456789',
            date: '2025-12-10',
            time: '14:00',
            service: 'Naprawa laptopa',
            duration: 120,
            price: 250,
            device: 'Dell XPS 13',
            description: 'Test naprawy funkcji booking'
        };

        console.log('Wysyłanie zapytania do create-booking...');
        const { data, error } = await supabase.functions.invoke('create-booking', {
            body: bookingData,
        });

        if (error) {
            console.log('❌ Błąd funkcji create-booking:', error.message);
            console.log('Szczegóły błędu:', error);
        } else {
            console.log('✅ Funkcja create-booking działa!');
            console.log('Odpowiedź:', data);
        }

    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
    }
}

testCreateBookingFunction();
