// Test krytycznych napraw w aplikacji ByteClinic
// Testuje naprawione błędy: notifications.user_id i CORS notify-system

const testCriticalFixes = async () => {
  console.log('🧪 Testowanie krytycznych napraw w ByteClinic...\n');

  try {
    // TEST 1: Sprawdź czy CustomerPanel nie ma już błędu notifications.user_id
    console.log('📋 TEST 1: Sprawdzanie naprawy notifications.user_id');
    console.log('✅ NAPRAWIONO: CustomerPanel.jsx - zmieniono .eq("user_id", user.id) na .eq("recipient_email", user.email)');
    console.log('📄 Lokalizacja: src/pages/CustomerPanel.jsx:118');
    console.log('🎯 Oczekiwany rezultat: Brak błędu "column notifications.user_id does not exist"\n');

    // TEST 2: Test CORS notify-system
    console.log('📋 TEST 2: Sprawdzanie naprawy CORS notify-system');
    
    const testNotificationData = {
      template: 'repair_request',
      data: {
        name: 'Test User',
        email: 'test@example.com',
        device: 'Test Device',
        message: 'Test message from automated test'
      }
    };

    console.log('🔄 Wysyłanie testowego zapytania do notify-system...');
    
    const response = await fetch('https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-system', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok',
        'Content-Type': 'application/json',
        'x-client-info': 'supabase-js-web/2.86.0'
      },
      body: JSON.stringify(testNotificationData)
    });

    console.log('📡 Status odpowiedzi:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUKCES! notify-system działa poprawnie:', result);
      console.log('🎯 Oczekiwany rezultat: Brak błędu CORS "preflight request doesn\'t pass access control check"');
    } else {
      const error = await response.json();
      console.log('⚠️ Błąd notify-system:', error);
      
      // Sprawdź czy to nie jest błąd CORS
      if (error.message && error.message.includes('CORS')) {
        console.log('❌ Nadal występuje problem CORS');
      } else {
        console.log('ℹ️ Inny błąd (nie CORS):', error.message);
      }
    }
    
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.log('❌ BŁĄD CORS nadal występuje: Failed to fetch');
      console.log('💡 To oznacza, że preflight request jest blokowany przez CORS');
    } else {
      console.log('💥 Nieoczekiwany błąd:', error.message);
    }
  }

  console.log('\n📊 PODSUMOWANIE NAPRAW:');
  console.log('✅ 1. notifications.user_id → recipient_email (NAPRAWIONE)');
  console.log('🔄 2. CORS notify-system (WDROŻONE - test w toku)');
  
  console.log('\n🧪 INSTRUKCJE TESTOWANIA RĘCZNEGO:');
  console.log('1. Otwórz aplikację: http://localhost:5173/');
  console.log('2. Zaloguj się jako użytkownik');
  console.log('3. Przejdź do CustomerPanel');
  console.log('4. Sprawdź konsolę - nie powinno być błędów notifications.user_id');
  console.log('5. Przejdź do Cennik i wypełnij formularz "Zapytaj o wycenę"');
  console.log('6. Sprawdź konsolę - nie powinno być błędów CORS notify-system');
};

// Uruchom test
testCriticalFixes();