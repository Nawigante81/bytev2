// Test script for the new admin-users edge function
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wllxicmacmfzmqdnovhp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

async function testAdminUsersAPI() {
  console.log('🧪 Testing Admin Users Edge Function...\n');
  console.log('🔗 Supabase URL:', SUPABASE_URL);

  try {
    // Test 1: List users (should fail without admin token)
    console.log('\n📋 Test 1: Attempting to list users without authentication...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('📊 Raw response:', errorText);
      
      try {
        const result = JSON.parse(errorText);
        console.log('📊 Parsed response:', result);
        
        // Check for various unauthorized response formats
        if (result.error === 'Brak uprawnień administratora' || 
            result.code === 401 || 
            result.message === 'Missing authorization header' ||
            response.status === 401) {
          console.log('✅ Test 1 PASSED: Correctly rejected unauthorized access');
        } else {
          console.log('❌ Test 1 FAILED: Expected admin permission error, got:', result.error || result.message);
        }
      } catch (parseError) {
        console.log('❌ Test 1 FAILED: Could not parse JSON response');
      }
    } else {
      console.log('❌ Test 1 FAILED: Should have returned 403/401 error');
    }

    console.log('\n📋 Test 2: Attempting invalid POST request...');
    const postResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        action: 'invalid-action',
        userId: 'test-id'
      })
    });

    console.log('📊 POST Response status:', postResponse.status);
    
    if (!postResponse.ok) {
      const postErrorText = await postResponse.text();
      console.log('📊 POST Raw response:', postErrorText);
      
      try {
        const postResult = JSON.parse(postErrorText);
        console.log('📊 POST Parsed response:', postResult);
        
        // Check for various unauthorized/invalid response formats
        if (postResult.error?.includes('Nieobsługiwane działanie') || 
            postResult.error?.includes('Brak uprawnień administratora') ||
            postResult.code === 401 || 
            postResult.message === 'Missing authorization header' ||
            postResponse.status === 401) {
          console.log('✅ Test 2 PASSED: Correctly handled invalid action or unauthorized access');
        } else {
          console.log('❌ Test 2 FAILED: Expected action or permission error, got:', postResult.error || postResult.message);
        }
      } catch (parseError) {
        console.log('❌ Test 2 FAILED: Could not parse JSON response');
      }
    }

    console.log('\n🎉 Basic connectivity tests completed!');
    console.log('\n📚 To test with a real admin token:');
    console.log('1. Get an admin session token from the frontend');
    console.log('2. Test with: curl -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('   -H "apikey: YOUR_ANON_KEY" \\');
    console.log('   "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/admin-users"');

  } catch (error) {
    console.error('❌ Network/Connection error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check internet connection');
    console.log('2. Verify Supabase project URL is correct');
    console.log('3. Ensure the function was deployed successfully');
    console.log('4. Check Supabase project status in dashboard');
  }
}

testAdminUsersAPI();