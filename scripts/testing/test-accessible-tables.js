// Test dostępnych tabel przez Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAccessibleTables() {
    console.log('Test dostępnych tabel przez Supabase client...\n');

    // Lista potencjalnych tabel do sprawdzenia
    const tableNames = [
        'requests',
        'diagnosis_requests', 
        'ticket_comments',
        'profiles',
        'users'
    ];

    for (const tableName of tableNames) {
        try {
            console.log(`Testowanie tabeli: ${tableName}`);
            const { data, error } = await supabase
                .from(tableName)
                .select('id')
                .limit(1);

            if (error) {
                console.log(`❌ ${tableName}: Błąd - ${error.message}`);
            } else {
                console.log(`✅ ${tableName}: Dostępna (${data?.length || 0} rekordów)`);
            }
        } catch (err) {
            console.log(`❌ ${tableName}: Wyjątek - ${err.message}`);
        }
        console.log('');
    }

    // Test join z diagnosis_requests (jak sugerował błąd)
    console.log('=== TEST JOIN Z diagnosis_requests ===');
    try {
        const { data: joinData, error: joinError } = await supabase
            .from('ticket_comments')
            .select(`
                id, 
                ticket_id, 
                author_id, 
                body, 
                created_at,
                diagnosis_requests!ticket_id (
                    id
                )
            `)
            .limit(5);

        if (joinError) {
            console.log('❌ Join z diagnosis_requests nie działa:', joinError.message);
        } else {
            console.log('✅ Join z diagnosis_requests działa!', joinData?.length || 0, 'rekordów');
        }
    } catch (err) {
        console.log('❌ Wyjątek przy join z diagnosis_requests:', err.message);
    }
}

testAccessibleTables();