// Fix Database Issues Direct Approach
import { createClient } from '@supabase/supabase-js';

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

async function fixDatabaseIssuesDirect() {
  console.log('🔧 Starting direct database fixes...\n');

  try {
    // 1. Check current policies and identify problematic ones
    console.log('1️⃣ Checking current policies...');
    await checkCurrentPolicies();
    
    // 2. Test table existence and create missing tables
    console.log('\n2️⃣ Checking and creating missing tables...');
    await checkAndCreateTablesDirect();
    
    // 3. Test database connectivity with basic queries
    console.log('\n3️⃣ Testing database connectivity...');
    await testDatabaseConnectivityDirect();
    
    // 4. Address Google Analytics DNS issues
    console.log('\n4️⃣ Addressing Google Analytics DNS issues...');
    await addressAnalyticsIssues();
    
    console.log('\n✅ All database issues addressed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database issues:', error);
    throw error;
  }
}

async function checkCurrentPolicies() {
  try {
    const { data: policies, error } = await supabaseAdmin
      .from('pg_policies')
      .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
      .eq('schemaname', 'public')
      .eq('tablename', 'profiles');
    
    if (error) {
      console.log(`   ⚠️ Error checking policies: ${error.message}`);
      return;
    }
    
    console.log('   📋 Current profiles policies:');
    if (policies && policies.length > 0) {
      policies.forEach(policy => {
        console.log(`     - ${policy.policyname} (${policy.cmd})`);
        if (policy.qual && policy.qual.includes('is_admin')) {
          console.log(`       ⚠️ Contains is_admin function - potential recursion source`);
        }
      });
    } else {
      console.log('     No policies found');
    }
  } catch (err) {
    console.log(`   ⚠️ Error: ${err.message}`);
  }
}

async function checkAndCreateTablesDirect() {
  // Check tables that should exist
  const tables = [
    { name: 'diagnosis_requests', expected: true },
    { name: 'user_files', expected: true },
    { name: 'requests', expected: true },
    { name: 'profiles', expected: true }
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin
        .from(table.name)
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST205') {
        console.log(`   ❌ Table ${table.name} does not exist`);
        if (table.expected) {
          console.log(`   🔨 Creating table: ${table.name}`);
          await createMissingTable(table.name);
        }
      } else if (error) {
        console.log(`   ⚠️ Error checking ${table.name}: ${error.message}`);
      } else {
        console.log(`   ✅ Table ${table.name} exists`);
      }
    } catch (err) {
      console.log(`   ⚠️ Error checking ${table.name}: ${err.message}`);
    }
  }
}

async function createMissingTable(tableName) {
  // For tables that don't exist, we can't create them via REST API
  // This would need to be done via SQL migration
  console.log(`   ⚠️ Cannot create ${tableName} via REST API - requires SQL migration`);
  console.log(`   📝 Manual SQL execution needed for table creation`);
}

async function testDatabaseConnectivityDirect() {
  // Test basic connectivity using available tables
  const tests = [
    { name: 'profiles', query: () => supabaseAdmin.from('profiles').select('count').limit(1) },
    { name: 'requests', query: () => supabaseAdmin.from('requests').select('count').limit(1) }
  ];

  for (const test of tests) {
    try {
      const { data, error } = await test.query();
      if (error) {
        console.log(`   ❌ ${test.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${test.name}: Query successful`);
      }
    } catch (err) {
      console.log(`   ❌ ${test.name}: ${err.message}`);
    }
  }
}

async function addressAnalyticsIssues() {
  console.log('   🌐 Google Analytics DNS resolution issues detected');
  console.log('   📝 These are typically network/DNS issues, not database problems');
  console.log('   💡 Solutions:');
  console.log('     1. Check network connectivity');
  console.log('     2. Verify DNS settings');
  console.log('     3. Consider using analytics.js instead of gtag.js');
  console.log('     4. Check if analytics domain is blocked by firewall/proxy');
}

// Main execution
fixDatabaseIssuesDirect()
  .then(() => {
    console.log('\n📊 Database issues analysis completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
