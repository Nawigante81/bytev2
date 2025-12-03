// Kompleksowy test systemu powiadomień
// Testowanie różnych funkcji Edge Functions dla powiadomień

const SUPABASE_URL = 'https://glwqpjqvivzkbbvluxdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsd3FwanF2aXZ6a2Jidmx1eGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzQ0NDYsImV4cCI6MjA3NzE1MDQ0Nn0.rxdXK0JNSBt65EGxU1Mb0d-Up0WBq3c6pz6dCvGy5yc';

// Test różnych funkcji powiadomień
async function testNotification(endpoint, payload) {
  try {
    console.log(`🧪 Testing endpoint: ${endpoint}`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Response:`, JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.statusText}`);
      return { success: false, error: response.statusText, data: result };
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error(`💥 Exception for ${endpoint}:`, error);
    return { success: false, error: error.message };
  }
}

// Test 1: Nowe zgłoszenie naprawcze
async function testNewRepairRequest() {
  console.log('\n🔧 TEST 1: Nowe zgłoszenie naprawcze');
  const payload = {
    template: 'repair_request',
    data: {
      id: 'repair-test-001',
      name: 'Anna Testowa',
      email: 'anna.test@example.com',
      phone: '+48 500 600 700',
      device: 'MacBook Pro 2020',
      message: 'Nie włącza się po aktualizacji macOS'
    }
  };
  return await testNotification('notify-system', payload);
}

// Test 2: Rezerwacja usługi
async function testBookingService() {
  console.log('\n📅 TEST 2: Rezerwacja usługi');
  const payload = {
    template: 'booking_confirmation',
    data: {
      name: 'Jan Kowalski',
      email: 'jan.kowalski@example.com',
      date: '2025-12-05',
      time: '14:30',
      service: 'Diagnoza i naprawa laptopa',
      duration: 60,
      price: 120
    }
  };
  return await testNotification('notify-system', payload);
}

// Test 3: Aktualizacja statusu naprawy
async function testRepairStatus() {
  console.log('\n📊 TEST 3: Aktualizacja statusu naprawy');
  const payload = {
    template: 'repair_status_update',
    data: {
      repairId: 'rep-001',
      name: 'Piotr Nowak',
      email: 'piotr.nowak@example.com',
      status: 'w naprawie',
      progress: 45,
      notes: 'Wymieniono uszkodzony dysk SSD, instalujemy nowy system'
    }
  };
  return await testNotification('notify-system', payload);
}

// Test 4: Naprawa gotowa do odbioru
async function testRepairReady() {
  console.log('\n🎉 TEST 4: Naprawa gotowa do odbioru');
  const payload = {
    template: 'repair_status_update',
    data: {
      repairId: 'rep-001',
      name: 'Piotr Nowak',
      email: 'piotr.nowak@example.com',
      status: 'gotowe',
      progress: 100,
      notes: 'Naprawa zakończona. Urządzenie działa perfekcyjnie!'
    }
  };
  return await testNotification('notify-system', payload);
}

// Test 5: Test innych potencjalnych funkcji
async function testOtherFunctions() {
  console.log('\n🔍 TEST 5: Testowanie innych funkcji Edge Functions');
  
  const functions = [
    'notify-new-diagnosis',
    'booking-api'
  ];
  
  const results = [];
  
  for (const func of functions) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true, function: func })
      });
      
      const result = await response.json();
      console.log(`📋 ${func}: ${response.status} - ${JSON.stringify(result)}`);
      results.push({ function: func, status: response.status, result });
    } catch (error) {
      console.error(`💥 Error testing ${func}:`, error);
      results.push({ function: func, error: error.message });
    }
  }
  
  return results;
}

// Test statystyk powiadomień
function getNotificationStats() {
  console.log('\n📊 STATYSTYKI SYSTEMU POWIADOMIEŃ:');
  
  // Symulacja lokalnych danych (Node.js nie ma localStorage)
  const localStorageReminders = 0;
  
  console.log(`📝 Przypomnienia w localStorage: ${localStorageReminders}`);
  console.log(`ℹ️ Test działa w środowisku Node.js - localStorage niedostępne`);
  
  return {
    localStorageReminders,
    localStorageData: []
  };
}

// Uruchom wszystkie testy
async function runAllTests() {
  console.log('🚀 ROZPOCZYNAM KOMPLEKSOWE TESTOWANIE SYSTEMU POWIADOMIEŃ');
  console.log(`📅 Data testów: ${new Date().toLocaleString('pl-PL')}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log('=' .repeat(80));
  
  try {
    // Test 1-4: Podstawowe powiadomienia
    const results = [];
    results.push(await testNewRepairRequest());
    results.push(await testBookingService());
    results.push(await testRepairStatus());
    results.push(await testRepairReady());
    
    // Test 5: Inne funkcje
    console.log('\n🔍 Testowanie dodatkowych funkcji Edge Functions...');
    const otherResults = await testOtherFunctions();
    
    // Statystyki
    const stats = getNotificationStats();
    
    // Podsumowanie
    console.log('\n' + '=' .repeat(80));
    console.log('📊 PODSUMOWANIE TESTÓW:');
    
    const successfulTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    console.log(`✅ Pomyślne testy powiadomień: ${successfulTests}/${totalTests}`);
    console.log(`📧 Przypomnienia w localStorage: ${stats.localStorageReminders}`);
    console.log(`🔧 Inne funkcje Edge Functions: ${otherResults.length} przetestowanych`);
    
    // Szczegóły błędów
    results.forEach((result, index) => {
      if (!result.success) {
        console.log(`❌ Błąd testu ${index + 1}:`, result.error);
      }
    });
    
    console.log('\n🎉 TESTOWANIE ZAKOŃCZONE!');
    
    return {
      notificationTests: results,
      otherFunctions: otherResults,
      stats,
      summary: {
        successful: successfulTests,
        total: totalTests,
        successRate: `${Math.round((successfulTests/totalTests) * 100)}%`
      }
    };
    
  } catch (error) {
    console.error('💥 KRYTYCZNY BŁĄD TESTOWANIA:', error);
    return { error: error.message };
  }
}

// Uruchom testy
if (typeof window === 'undefined') {
  // Testy Node.js
  runAllTests().then(result => {
    console.log('\n🎯 WYNIK KOŃCOWY:', JSON.stringify(result, null, 2));
  });
} else {
  // Testy w przeglądarce
  console.log('Uruchamianie testów w przeglądarce...');
}

export { testNotification, runAllTests };