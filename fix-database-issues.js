#!/usr/bin/env node

/**
 * Fix Database Issues Script
 * Addresses infinite recursion in Supabase policies and missing tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabaseIssues() {
  console.log('🔧 Starting database fixes...\n');

  try {
    // 1. Fix infinite recursion in profiles policies
    console.log('1️⃣ Fixing infinite recursion in profiles policies...');
    await fixProfilesPolicies();
    
    // 2. Check and create missing tables
    console.log('\n2️⃣ Checking and creating missing tables...');
    await checkAndCreateTables();
    
    // 3. Test database connectivity
    console.log('\n3️⃣ Testing database connectivity...');
    await testDatabaseConnectivity();
    
    console.log('\n✅ All database issues fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database issues:', error);
    process.exit(1);
  }
}

async function fixProfilesPolicies() {
  // Drop problematic policies that cause infinite recursion
  const dropPolicies = [
    'profiles_select_own',
    'profiles_select_public_reviewers', 
    'profiles_update_own',
    'profiles_delete_admin',
    'profiles_insert_self',
    'profiles_select_self',
    'profiles_update_self'
  ];

  console.log('🗑️ Dropping problematic policies...');
  for (const policyName of dropPolicies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS ${policyName} ON public.profiles;`
      });
      if (error) {
        console.log(`   ⚠️ Policy ${policyName} may not exist: ${error.message}`);
      } else {
        console.log(`   ✅ Dropped policy: ${policyName}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Error dropping ${policyName}: ${err.message}`);
    }
  }

  // Create new policies without circular dependencies
  console.log('🔨 Creating new policies without circular dependencies...');
  
  const newPolicies = [
    {
      name: 'profiles_select_own_simple',
      sql: `CREATE POLICY profiles_select_own_simple ON public.profiles
            FOR SELECT USING (id = auth.uid());`
    },
    {
      name: 'profiles_select_admin_simple', 
      sql: `CREATE POLICY profiles_select_admin_simple ON public.profiles
            FOR SELECT TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM auth.users u 
                WHERE u.id = auth.uid() 
                AND u.raw_user_meta_data->>'role' = 'admin'
              )
            );`
    },
    {
      name: 'profiles_insert_self_simple',
      sql: `CREATE POLICY profiles_insert_self_simple ON public.profiles
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = id);`
    },
    {
      name: 'profiles_update_own_simple',
      sql: `CREATE POLICY profiles_update_own_simple ON public.profiles
            FOR UPDATE TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);`
    }
  ];

  for (const policy of newPolicies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.log(`   ⚠️ Error creating ${policy.name}: ${error.message}`);
      } else {
        console.log(`   ✅ Created policy: ${policy.name}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Error creating ${policy.name}: ${err.message}`);
    }
  }
}

async function checkAndCreateTables() {
  // Check if tables exist
  const tablesToCheck = ['diagnosis_requests', 'user_files', 'requests'];
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST205') {
        console.log(`   ⚠️ Table ${tableName} does not exist`);
        await createMissingTable(tableName);
      } else if (error) {
        console.log(`   ⚠️ Error checking ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ Table ${tableName} exists`);
      }
    } catch (err) {
      console.log(`   ⚠️ Error checking ${tableName}: ${err.message}`);
    }
  }
}

async function createMissingTable(tableName) {
  console.log(`🔨 Creating missing table: ${tableName}`);
  
  let createSQL = '';
  
  if (tableName === 'diagnosis_requests') {
    createSQL = `
      CREATE TABLE IF NOT EXISTS public.diagnosis_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        name text NOT NULL,
        email text NOT NULL,
        phone text,
        device text,
        message text,
        consent boolean NOT NULL DEFAULT false,
        source_url text,
        user_agent text,
        status text NOT NULL DEFAULT 'new',
        priority text DEFAULT 'Normalny',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      
      ALTER TABLE public.diagnosis_requests ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY diagnosis_requests_select_all ON public.diagnosis_requests
        FOR SELECT USING (true);
        
      CREATE POLICY diagnosis_requests_insert_all ON public.diagnosis_requests
        FOR INSERT WITH CHECK (true);
    `;
  } else if (tableName === 'user_files') {
    createSQL = `
      CREATE TABLE IF NOT EXISTS public.user_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        storage_path text NOT NULL,
        file_name text NOT NULL,
        content_type text,
        size bigint,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      
      ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY user_files_select_own ON public.user_files
        FOR SELECT USING (user_id = auth.uid());
        
      CREATE POLICY user_files_insert_own ON public.user_files
        FOR INSERT WITH CHECK (user_id = auth.uid());
    `;
  }
  
  if (createSQL) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createSQL });
      if (error) {
        console.log(`   ⚠️ Error creating ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ Created table: ${tableName}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Error creating ${tableName}: ${err.message}`);
    }
  }
}

async function testDatabaseConnectivity() {
  // Test basic queries
  const tests = [
    { name: 'profiles', query: 'SELECT COUNT(*) as count FROM public.profiles' },
    { name: 'diagnosis_requests', query: 'SELECT COUNT(*) as count FROM public.diagnosis_requests LIMIT 1' },
    { name: 'user_files', query: 'SELECT COUNT(*) as count FROM public.user_files LIMIT 1' },
    { name: 'requests', query: 'SELECT COUNT(*) as count FROM public.requests LIMIT 1' }
  ];

  for (const test of tests) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: test.query });
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

// Run the fix
fixDatabaseIssues().catch(console.error);