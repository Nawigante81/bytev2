// Test join między ticket_comments a requests
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJoinQuery() {
    try {
        console.log('Test join między ticket_comments a requests...\n');
        
        // Test 1: Sprawdź czy requests tabela istnieje
        const { data: requests, error: requestsError } = await supabase
            .from('requests')
            .select('id')
            .limit(1);

        if (requestsError) {
            console.error('Błąd z tabelą requests:', requestsError);
        } else {
            console.log('✅ Tabela requests istnieje');
        }

        // Test 2: Spróbuj prosty join
        console.log('\nPróba join z requests...');
        const { data: commentsWithJoin, error: joinError } = await supabase
            .from('ticket_comments')
            .select(`
                id, 
                ticket_id, 
                author_id, 
                body, 
                created_at,
                requests!ticket_id (
                    id
                )
            `)
            .limit(5);

        if (joinError) {
            console.error('❌ Błąd join:', joinError);
            console.log('\nTo oznacza, że foreign key relationship nie jest rozpoznawany przez Supabase client.');
            console.log('Rozwiązanie: będziemy musieli pobrać dane osobno lub użyć prostego zapytania bez join.');
        } else {
            console.log('✅ Join działa!', commentsWithJoin?.length || 0, 'rekordów');
        }

    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
    }
}

testJoinQuery();
