#!/usr/bin/env node

/**
 * Test script for new Postmark email system
 * Tests the notify-new-diagnosis edge function
 */

// Use built-in fetch (Node.js 18+)

const SUPABASE_URL = 'https://glwqpjqvivzkbbvluxdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsd3FwanF2aXZ6a2JidmZ1eGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MjQ1MTQsImV4cCI6MjA0OTUwMDUxNH0.h0x8c9sS7i5d5d9g8aV5k2g7L5n3H8aG0pGf2j4k6M';

// Test data
const testPayload = {
  record: {
    id: 'test-email-' + Date.now(),
    name: 'Jan Kowalski Test',
    email: 'test@example.com',
    phone: '+48 123 456 789',
    device: 'iPhone 15 Pro',
    message: 'Test message - ekran nie reaguje na dotyk',
    created_at: new Date().toISOString()
  }
};

async function testEmailFunction() {
  console.log('🧪 Testing Postmark Email System');
  console.log('=====================================');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-new-diagnosis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📧 Response:`, JSON.stringify(result, null, 2));
    
    if (response.ok && result.ok) {
      console.log('✅ Test PASSED - Email sent successfully');
      console.log(`📨 Email ID: ${result.id}`);
    } else {
      console.log('❌ Test FAILED');
      console.log(`Error: ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔧 Testing Environment Variables');
  console.log('=================================');
  
  const requiredVars = [
    'POSTMARK_SERVER_TOKEN',
    'FROM_EMAIL', 
    'FROM_NAME',
    'ADMIN_EMAIL'
  ];
  
  for (const varName of requiredVars) {
    console.log(`📋 ${varName}: ${process.env[varName] ? '✅ Set' : '❌ Missing'}`);
  }
}

// Main execution
async function main() {
  console.log('🚀 Email System Test Suite');
  console.log('============================\n');
  
  await testEnvironmentVariables();
  await testEmailFunction();
  
  console.log('\n📝 Next Steps:');
  console.log('1. Configure Postmark account');
  console.log('2. Set environment variables in Supabase');
  console.log('3. Deploy function: supabase functions deploy notify-new-diagnosis');
  console.log('4. Run this test again with real credentials');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testEmailFunction, testEnvironmentVariables };