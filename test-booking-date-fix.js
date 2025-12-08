// Test funkcji parsowania daty w create-booking
// Testuje czy polskie daty są poprawnie konwertowane na format ISO

const testBookingFunction = async () => {
  try {
    console.log('🧪 Testowanie funkcji create-booking z polskimi datami...\n');
    
    // Przykładowe dane rezerwacji z polską datą
    const testBookingData = {
      bookingId: 'TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: 'Test User',
      email: 'test@example.com',
      phone: '+48 123 456 789',
      date: 'czwartek, 11 grudnia 2025', // Format polskiej daty
      time: '14:00',
      service: 'Diagnoza laptopa',
      duration: 60,
      price: 99,
      device: 'laptop',
      description: 'Test rezerwacji'
    };
    
    console.log('📋 Dane testowe:', testBookingData);
    console.log('📅 Data do przetestowania:', testBookingData.date);
    
    // Wywołanie funkcji Edge Function
    const response = await fetch('https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/create-booking', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok',
        'Content-Type': 'application/json',
        'x-client-info': 'supabase-js-web/2.86.0'
      },
      body: JSON.stringify(testBookingData)
    });
    
    console.log('📡 Status odpowiedzi:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sukces! Rezerwacja utworzona:', result);
      
      // Sprawdź czy data została poprawnie sparsowana w logach
      console.log('\n🔍 Sprawdź logi funkcji w Supabase Dashboard:');
      console.log('https://supabase.com/dashboard/project/wllxicmacmfzmqdnovhp/functions/create-booking/logs');
      
    } else {
      const error = await response.json();
      console.error('❌ Błąd rezerwacji:', error);
      
      // Sprawdź czy błąd dotyczy parsowania daty
      if (error.error && error.error.includes('invalid input syntax for type date')) {
        console.error('🚨 Nadal występuje błąd parsowania daty!');
      } else {
        console.error('💡 Inny błąd - sprawdź logi funkcji');
      }
    }
    
  } catch (error) {
    console.error('💥 Błąd podczas testu:', error);
  }
};

// Uruchom test
testBookingFunction();