// Sprawdź wszystkie tabele w bazie danych
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllTables() {
    try {
        console.log('Sprawdzanie wszystkich tabel w bazie danych...\n');
        
        // Sprawdź wszystkie tabele
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name, table_type')
            .eq('table_schema', 'public')
            .order('table_name');

        if (tablesError) {
            console.error('Błąd pobierania tabel:', tablesError);
        } else {
            console.log('=== WSZYSTKIE TABELE W SCHEMACIE PUBLIC ===');
            tables?.forEach(table => {
                console.log(`${table.table_name} (${table.table_type})`);
            });
        }

        // Sprawdź konkretnie tabele związane z ticket/request/diagnosis
        console.log('\n=== TABELE ZWIĄZANE Z TICKET/REQUEST/DIAGNOSIS ===');
        const { data: relatedTables, error: relatedError } = await supabase
            .from('information_schema.tables')
            .select('table_name, table_type')
            .eq('table_schema', 'public')
            .or('table_name.like.%ticket%,table_name.like.%request%,table_name.like.%diagnosis%')
            .order('table_name');

        if (relatedError) {
            console.error('Błąd pobierania powiązanych tabel:', relatedError);
        } else {
            relatedTables?.forEach(table => {
                console.log(`✅ ${table.table_name} (${table.table_type})`);
            });
        }

        // Sprawdź strukturę ticket_comments
        console.log('\n=== STRUKTURA TABELI ticket_comments ===');
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'ticket_comments')
            .eq('table_schema', 'public')
            .order('ordinal_position');

        if (columnsError) {
            console.error('Błąd pobierania kolumn:', columnsError);
        } else {
            columns?.forEach(col => {
                console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
        }

        // Sprawdź foreign key constraints
        console.log('\n=== FOREIGN KEY CONSTRAINTS dla ticket_comments ===');
        const { data: fkConstraints, error: fkError } = await supabase
            .from('information_schema.key_column_usage')
            .select(`
                column_name,
                constraint_name,
                table_name,
                referenced_table_name,
                referenced_column_name
            `)
            .eq('table_name', 'ticket_comments')
            .eq('table_schema', 'public');

        if (fkError) {
            console.error('Błąd pobierania foreign key constraints:', fkError);
        } else {
            fkConstraints?.forEach(fk => {
                console.log(`${fk.column_name} -> ${fk.referenced_table_name}.${fk.referenced_column_name} (constraint: ${fk.constraint_name})`);
            });
        }

    } catch (error) {
        console.error('Nieoczekiwany błąd:', error);
    }
}

checkAllTables();
