// Execute Database Fixes Script
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create client with service_role permissions
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function executeDatabaseFixes() {
  try {
    console.log('🔧 Starting database fixes execution...');
    
    // Read the SQL fix file
    const sqlFixes = fs.readFileSync('./fix-policies-manual.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlFixes
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .join('; ');
    
    console.log('📝 Executing SQL fixes...');
    
    // Execute each statement separately
    const results = [];
    for (const statement of statements.split('; ').filter(s => s.trim())) {
      if (statement.trim()) {
        try {
          const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.log(`⚠️ Warning executing: ${error.message}`);
            console.log(`   Statement: ${statement.substring(0, 100)}...`);
          } else {
            console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
          }
          results.push({ statement, result: data, error });
        } catch (err) {
          console.log(`❌ Error for statement: ${statement.substring(0, 50)}...`);
          console.log(`💥 Error details: ${err.message}`);
          results.push({ statement, error: err });
        }
      }
    }
    
    console.log('\n🔍 Testing database connectivity...');
    
    // Test basic queries
    const tests = [
      { name: 'profiles', query: 'SELECT COUNT(*) as count FROM public.profiles LIMIT 1' },
      { name: 'diagnosis_requests', query: 'SELECT COUNT(*) as count FROM public.diagnosis_requests LIMIT 1' },
      { name: 'user_files', query: 'SELECT COUNT(*) as count FROM public.user_files LIMIT 1' },
      { name: 'requests', query: 'SELECT COUNT(*) as count FROM public.requests LIMIT 1' }
    ];

    for (const test of tests) {
      try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: test.query });
        if (error) {
          console.log(`   ❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`   ✅ ${test.name}: Query successful`);
        }
      } catch (err) {
        console.log(`   ❌ ${test.name}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Database fixes completed!');
    return { success: true, results };
    
  } catch (error) {
    console.error('💥 Critical error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the fixes
executeDatabaseFixes()
  .then(result => {
    console.log('\n📊 FINAL RESULT:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
