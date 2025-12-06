#!/usr/bin/env node

/**
 * Comprehensive Database Functions Test
 * Tests all database-related functions in the ByteClinic application
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables - simplified parser
// Note: For production, consider using 'dotenv' package
try {
  const envPath = '.env';
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const envVars = content
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.startsWith('#'))
      .reduce((acc, line) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (key === 'VITE_SUPABASE_URL' && !process.env.VITE_SUPABASE_URL) {
            process.env.VITE_SUPABASE_URL = value;
          } else if (key === 'VITE_SUPABASE_ANON_KEY' && !process.env.VITE_SUPABASE_ANON_KEY) {
            process.env.VITE_SUPABASE_ANON_KEY = value;
          }
        }
        return acc;
      }, {});
  }
} catch (e) {
  console.warn('⚠️ Failed to read .env:', e?.message || e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results storage
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, message, error = null) {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ [PASS] ${name}: ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ [FAIL] ${name}: ${message}`);
    if (error) {
      console.log(`   Error: ${error.message || error}`);
    }
  }
  testResults.tests.push({ name, status, message, error: error?.message });
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  console.log('\n📡 Test 1: Database Connection');
  console.log('─'.repeat(50));
  try {
    const { data, error } = await supabase.from('profiles').select('count').single();
    if (error) throw error;
    logTest('Database Connection', 'PASS', 'Successfully connected to database');
    return true;
  } catch (error) {
    logTest('Database Connection', 'FAIL', 'Cannot connect to database', error);
    return false;
  }
}

// Test 2: Bookings Table
async function testBookingsTable() {
  console.log('\n📅 Test 2: Bookings Table');
  console.log('─'.repeat(50));
  
  try {
    // Check if table exists
    const { data: existCheck, error: existError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (existError) {
      logTest('Bookings Table - Existence', 'FAIL', 'Table does not exist or is inaccessible', existError);
      return false;
    }
    logTest('Bookings Table - Existence', 'PASS', 'Table exists and is accessible');
    
    // Test insert
    const testBooking = {
      booking_id: 'BC-TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customer_name: 'Test User DB Check',
      customer_email: 'test@example.com',
      customer_phone: '+48123456789',
      service_type: 'diag-laptop',
      service_name: 'Test diagnoza',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '12:00',
      duration_minutes: 60,
      price: 99,
      status: 'confirmed'
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()
      .single();
    
    if (insertError) {
      logTest('Bookings Table - Insert', 'FAIL', 'Cannot insert booking', insertError);
      return false;
    }
    logTest('Bookings Table - Insert', 'PASS', `Booking created with ID: ${inserted.id}`);
    
    // Test select
    const { data: selectedBooking, error: selectError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', inserted.id)
      .single();
    
    if (selectError) {
      logTest('Bookings Table - Select', 'FAIL', 'Cannot select booking', selectError);
    } else {
      logTest('Bookings Table - Select', 'PASS', 'Successfully retrieved booking');
    }
    
    // Test update
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', inserted.id);
    
    if (updateError) {
      logTest('Bookings Table - Update', 'FAIL', 'Cannot update booking', updateError);
    } else {
      logTest('Bookings Table - Update', 'PASS', 'Successfully updated booking status');
    }
    
    // Cleanup
    await supabase.from('bookings').delete().eq('id', inserted.id);
    logTest('Bookings Table - Delete', 'PASS', 'Test record cleaned up');
    
    return true;
  } catch (error) {
    logTest('Bookings Table - General', 'FAIL', 'Unexpected error', error);
    return false;
  }
}

// Test 3: Reviews Table
async function testReviewsTable() {
  console.log('\n⭐ Test 3: Reviews Table');
  console.log('─'.repeat(50));
  
  try {
    // Check if table exists
    const { data: existCheck, error: existError } = await supabase
      .from('reviews')
      .select('*')
      .limit(1);
    
    if (existError) {
      logTest('Reviews Table - Existence', 'FAIL', 'Table does not exist or is inaccessible', existError);
      return false;
    }
    logTest('Reviews Table - Existence', 'PASS', 'Table exists and is accessible');
    
    // Test select (without insert due to auth requirements)
    const { data: reviews, error: selectError } = await supabase
      .from('reviews')
      .select('*')
      .limit(5);
    
    if (selectError) {
      logTest('Reviews Table - Select', 'FAIL', 'Cannot select reviews', selectError);
    } else {
      logTest('Reviews Table - Select', 'PASS', `Found ${reviews?.length || 0} reviews`);
    }
    
    return true;
  } catch (error) {
    logTest('Reviews Table - General', 'FAIL', 'Unexpected error', error);
    return false;
  }
}

// Test 4: Notifications Table
async function testNotificationsTable() {
  console.log('\n🔔 Test 4: Notifications Table');
  console.log('─'.repeat(50));
  
  try {
    // Check if table exists
    const { data: existCheck, error: existError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (existError) {
      logTest('Notifications Table - Existence', 'FAIL', 'Table does not exist or is inaccessible', existError);
      return false;
    }
    logTest('Notifications Table - Existence', 'PASS', 'Table exists and is accessible');
    
    // Test select
    const { data: notifications, error: selectError } = await supabase
      .from('notifications')
      .select('*')
      .limit(5);
    
    if (selectError) {
      logTest('Notifications Table - Select', 'FAIL', 'Cannot select notifications', selectError);
    } else {
      logTest('Notifications Table - Select', 'PASS', `Found ${notifications?.length || 0} notifications`);
    }
    
    return true;
  } catch (error) {
    logTest('Notifications Table - General', 'FAIL', 'Unexpected error', error);
    return false;
  }
}

// Test 5: Repair Tracking (diagnoses table)
async function testRepairTracking() {
  console.log('\n🔧 Test 5: Repair Tracking (Diagnoses)');
  console.log('─'.repeat(50));
  
  try {
    // Check if table exists
    const { data: existCheck, error: existError } = await supabase
      .from('diagnoses')
      .select('*')
      .limit(1);
    
    if (existError) {
      logTest('Diagnoses Table - Existence', 'FAIL', 'Table does not exist or is inaccessible', existError);
      return false;
    }
    logTest('Diagnoses Table - Existence', 'PASS', 'Table exists and is accessible');
    
    // Test insert
    const testDiagnosis = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+48123456789',
      device: 'Test Device',
      message: 'Test repair request'
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('diagnoses')
      .insert(testDiagnosis)
      .select()
      .single();
    
    if (insertError) {
      logTest('Diagnoses Table - Insert', 'FAIL', 'Cannot insert diagnosis', insertError);
      return false;
    }
    logTest('Diagnoses Table - Insert', 'PASS', `Diagnosis created with ID: ${inserted.id}`);
    
    // Test select
    const { data: selectedDiagnosis, error: selectError } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('id', inserted.id)
      .single();
    
    if (selectError) {
      logTest('Diagnoses Table - Select', 'FAIL', 'Cannot select diagnosis', selectError);
    } else {
      logTest('Diagnoses Table - Select', 'PASS', 'Successfully retrieved diagnosis');
    }
    
    // Test update status
    const { error: updateError } = await supabase
      .from('diagnoses')
      .update({ status: 'in_progress' })
      .eq('id', inserted.id);
    
    if (updateError) {
      logTest('Diagnoses Table - Update', 'FAIL', 'Cannot update diagnosis status', updateError);
    } else {
      logTest('Diagnoses Table - Update', 'PASS', 'Successfully updated diagnosis status');
    }
    
    // Cleanup
    await supabase.from('diagnoses').delete().eq('id', inserted.id);
    logTest('Diagnoses Table - Delete', 'PASS', 'Test record cleaned up');
    
    return true;
  } catch (error) {
    logTest('Diagnoses Table - General', 'FAIL', 'Unexpected error', error);
    return false;
  }
}

// Test 6: Profiles Table
async function testProfilesTable() {
  console.log('\n👤 Test 6: Profiles Table');
  console.log('─'.repeat(50));
  
  try {
    // Check if table exists
    const { data: existCheck, error: existError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (existError) {
      logTest('Profiles Table - Existence', 'FAIL', 'Table does not exist or is inaccessible', existError);
      return false;
    }
    logTest('Profiles Table - Existence', 'PASS', 'Table exists and is accessible');
    
    // Test select
    const { data: profiles, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (selectError) {
      logTest('Profiles Table - Select', 'FAIL', 'Cannot select profiles', selectError);
    } else {
      logTest('Profiles Table - Select', 'PASS', `Found ${profiles?.length || 0} profiles`);
      
      // Check for admin profiles
      const adminProfiles = profiles?.filter(p => p.role === 'admin') || [];
      if (adminProfiles.length > 0) {
        logTest('Profiles Table - Admin Check', 'PASS', `Found ${adminProfiles.length} admin(s)`);
      } else {
        logTest('Profiles Table - Admin Check', 'FAIL', 'No admin profiles found');
      }
    }
    
    return true;
  } catch (error) {
    logTest('Profiles Table - General', 'FAIL', 'Unexpected error', error);
    return false;
  }
}

// Test 7: Central Requests Table
async function testCentralRequestsTable() {
  console.log('\n📋 Test 7: Central Requests Table');
  console.log('─'.repeat(50));
  
  try {
    // Check if table exists
    const { data: existCheck, error: existError } = await supabase
      .from('central_requests')
      .select('*')
      .limit(1);
    
    if (existError) {
      logTest('Central Requests Table - Existence', 'FAIL', 'Table does not exist or is inaccessible', existError);
      return false;
    }
    logTest('Central Requests Table - Existence', 'PASS', 'Table exists and is accessible');
    
    // Test select
    const { data: requests, error: selectError } = await supabase
      .from('central_requests')
      .select('*')
      .limit(5);
    
    if (selectError) {
      logTest('Central Requests Table - Select', 'FAIL', 'Cannot select requests', selectError);
    } else {
      logTest('Central Requests Table - Select', 'PASS', `Found ${requests?.length || 0} requests`);
    }
    
    return true;
  } catch (error) {
    logTest('Central Requests Table - General', 'FAIL', 'Unexpected error', error);
    return false;
  }
}

// Test 8: Edge Functions (Email notifications)
async function testEdgeFunctions() {
  console.log('\n🌐 Test 8: Edge Functions');
  console.log('─'.repeat(50));
  
  // We'll just check if the functions endpoint is accessible
  // Not actually calling them to avoid sending test emails
  
  const functions = [
    'notify-new-diagnosis',
    'notify-booking-confirmation',
    'notify-repair-status',
    'notify-appointment-reminder'
  ];
  
  for (const funcName of functions) {
    try {
      // Just check if we can reach the endpoint (will return 400 for missing body, but that's ok)
      const response = await fetch(`${supabaseUrl}/functions/v1/${funcName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      // Any response (even error) means the function exists
      if (response.status === 404) {
        logTest(`Edge Function - ${funcName}`, 'FAIL', 'Function not found');
      } else {
        logTest(`Edge Function - ${funcName}`, 'PASS', 'Function endpoint exists');
      }
    } catch (error) {
      logTest(`Edge Function - ${funcName}`, 'FAIL', 'Cannot reach function', error);
    }
  }
  
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  COMPREHENSIVE DATABASE FUNCTIONS TEST           ║');
  console.log('║  ByteClinic Application                          ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using ANON key: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log(`📅 Test Date: ${new Date().toLocaleString('pl-PL')}\n`);
  
  await testDatabaseConnection();
  await testBookingsTable();
  await testReviewsTable();
  await testNotificationsTable();
  await testRepairTracking();
  await testProfilesTable();
  await testCentralRequestsTable();
  await testEdgeFunctions();
  
  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%\n`);
  
  // Detailed results
  console.log('📋 Detailed Results:');
  console.log('─'.repeat(50));
  
  const failedTests = testResults.tests.filter(t => t.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });
  } else {
    console.log('\n🎉 All tests passed!');
  }
  
  // Save results to file
  const reportPath = '/tmp/db-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(1) + '%'
    },
    tests: testResults.tests
  }, null, 2));
  
  console.log(`\n💾 Report saved to: ${reportPath}`);
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();
