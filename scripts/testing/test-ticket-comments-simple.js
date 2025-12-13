// Prosty test tabeli ticket_comments
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTicketComments() {
    try {
        console.log('Test tabeli ticket_comments...\n');
        
        // Test 1: Sprawdź czy tabela istnieje i ma dane
        const { data: comments, error } = await supabase
            .from('ticket_comments')
            .select('id, ticket_id, author_id, body, created_at')
            .limit(5);

        if (error) {
            console.error('Błąd zapytania:', error);
            console.log('\nTo oznacza, że:');
            console.log('1. Migracja nie została zastosowana, lub');
            console.log('2. Tabela ma inną strukturę niż oczekiwana');
            
            // Sprawdź jakie tabele istnieją
            console.log('\nSprawdzanie dostępnych tabel...');
            const { data: tables, error: tablesError } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .like('table_name', '%ticket%');

            if (tablesError) {
                console.error('Błąd pobierania tabel:', tablesError);
            } else {
                console.log('Tabele z "ticket" w nazwie:', tables?.map(t => t.table_name));
            }
            
        } else {
            console.log('✅ Zapytanie działa! Znaleziono komentarzy:', comments?.length || 0);
            if (comments && comments.length > 0) {
                console.log('Przykład:', comments[0]);
            }
        }

    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
    }
}

testTicketComments();
