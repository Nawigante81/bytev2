// Test różnych struktur tabeli bookings
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBookingInsert() {
    try {
        console.log('Test różnych struktur tabeli bookings...\n');
        
        // Test 1: Próba insert z kolumnami które znamy z poprzedniego testu
        console.log('Test 1: Insert z podstawowymi kolumnami');
        const testData1 = {
            booking_id: 'test-123',
            service_type: 'naprawa',
            service_name: 'Test Service',
            device_type: 'laptop',
            booking_date: '2025-12-10',
            booking_time: '10:00',
            duration_minutes: 60,
            price: 100,
            status: 'confirmed',
            notes: 'Test booking'
        };

        const { data: result1, error: error1 } = await supabase
            .from('bookings')
            .insert(testData1)
            .select();

        if (error1) {
            console.log('❌ Błąd insert z podstawowymi kolumnami:', error1.message);
        } else {
            console.log('✅ Podstawowe kolumny działają:', result1?.length || 0, 'rekordów');
            console.log('Dostępne kolumny:', Object.keys(result1[0] || {}));
        }

        // Test 2: Spróbuj dodać kolumny customer
        console.log('\nTest 2: Próba z customer_* kolumnami');
        const testData2 = {
            booking_id: 'test-456',
            customer_name: 'Jan Kowalski',
            customer_email: 'test@example.com',
            customer_phone: '+48123456789',
            service_type: 'naprawa',
            device_type: 'laptop',
            booking_date: '2025-12-10',
            price: 100,
            status: 'confirmed'
        };

        const { data: result2, error: error2 } = await supabase
            .from('bookings')
            .insert(testData2)
            .select();

        if (error2) {
            console.log('❌ Błąd z customer_* kolumnami:', error2.message);
            console.log('To oznacza, że customer_* kolumny nie istnieją w bookings');
        } else {
            console.log('✅ Customer_* kolumny działają:', result2?.length || 0, 'rekordów');
        }

        // Test 3: Sprawdź strukturę customers
        console.log('\nTest 3: Sprawdzenie tabeli customers');
        const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .limit(1);

        if (customerError) {
            console.log('❌ Błąd z customers:', customerError.message);
        } else {
            console.log('✅ Tabela customers dostępna');
            if (customers && customers.length > 0) {
                console.log('Kolumny customers:', Object.keys(customers[0]));
            }
        }

        // Wyczyść testowe dane
        console.log('\nCzyszczenie testowych danych...');
        if (result1 && result1.length > 0) {
            await supabase.from('bookings').delete().in('id', result1.map(r => r.id));
        }
        if (result2 && result2.length > 0) {
            await supabase.from('bookings').delete().in('id', result2.map(r => r.id));
        }

    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
    }
}

testBookingInsert();