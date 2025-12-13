#!/usr/bin/env node

// Simple test for notify-new-diagnosis function
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const testPayload = {
  record: {
    id: 'test-final-' + Date.now(),
    name: 'Jan Kowalski',
    email: 'test@example.com',
    phone: '+48 123 456 789',
    device: 'iPhone 15 Pro',
    message: 'Test finalny - ekran nie działa',
    created_at: new Date().toISOString()
  }
};

async function testFunction() {
  console.log('🧪 Test funkcji notify-new-diagnosis');
  console.log('=====================================');
  
  try {
    console.log('📤 Wysyłanie żądania...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-new-diagnosis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`📊 Status HTTP: ${response.status}`);
    
    const result = await response.json();
    console.log('📧 Odpowiedź:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.ok) {
      console.log('✅ SUKCES - Funkcja działa poprawnie!');
      console.log(`📨 ID zgłoszenia: ${result.id}`);
    } else {
      console.log('❌ BŁĄD - Funkcja nie działa poprawnie');
      console.log(`Error: ${result.error || 'Nieznany błąd'}`);
    }
    
  } catch (error) {
    console.log('❌ BŁĄD SIECI:', error.message);
  }
}

// Run test
testFunction();
