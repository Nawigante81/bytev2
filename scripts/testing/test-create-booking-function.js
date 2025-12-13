// Test naprawionej funkcji create-booking
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok';

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