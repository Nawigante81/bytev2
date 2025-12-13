// Sprawdzenie struktury tabeli ticket_comments
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('Brak SUPABASE_SERVICE_ROLE_KEY w zmiennych środowiskowych');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    try {
        console.log('Sprawdzanie struktury tabeli ticket_comments...\n');
        
        // Sprawdź strukturę kolumn
        const { data: columns, error: colError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'ticket_comments')
            .eq('table_schema', 'public')
            .order('ordinal_position');

        if (colError) {
            console.error('Błąd pobierania kolumn:', colError);
        } else {
            console.log('=== KOLUMNY TABELI ticket_comments ===');
            columns.forEach(col => {
                console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
            });
        }

        console.log('\n=== TESTOWE ZAPYTANIE ===');
        
        // Test prostego zapytania bez join
        const { data: comments, error: commentError } = await supabase
            .from('ticket_comments')
            .select('id, ticket_id, author_id, body, created_at')
            .limit(5);

        if (commentError) {
            console.error('Błąd pobierania komentarzy:', commentError);
        } else {
            console.log(`Znaleziono ${comments?.length || 0} komentarzy`);
            if (comments && comments.length > 0) {
                console.log('Przykładowy komentarz:', comments[0]);
            }
        }

        console.log('\n=== SPRAWDZENIE RELACJI ===');
        
        // Sprawdź czy istnieje foreign key constraint
        const { data: constraints, error: constraintError } = await supabase
            .from('information_schema.table_constraints')
            .select('constraint_name, constraint_type')
            .eq('table_name', 'ticket_comments')
            .eq('table_schema', 'public');

        if (constraintError) {
            console.error('Błąd pobierania constraints:', constraintError);
        } else {
            console.log('Constraints dla ticket_comments:');
            constraints?.forEach(c => console.log(`- ${c.constraint_name}: ${c.constraint_type}`));
        }

    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
    }
}

checkSchema();