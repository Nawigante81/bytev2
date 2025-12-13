const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const m1 = line.match(/^VITE_SUPABASE_URL=(.*)$/);
    if (m1 && !process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = m1[1].trim();
    const m2 = line.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/);
    if (m2 && !process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = m2[1].trim();
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Brak VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY w .env');
  process.exit(1);
}

console.log('🔍 Test API Kontaktowego - ByteClinic\n');
console.log('📋 Konfiguracja:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   API Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
console.log('');

async function testContactAPI() {
  const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  
  const endpoints = [
    'notify-new-diagnosis',
    'send-contact',
    'contact',
    'notify-system'
  ];

  console.log('🧪 Testowanie różnych endpointów...\n');

  for (const endpoint of endpoints) {
    const url = `${SUPABASE_URL}/functions/v1/${endpoint}`;
    
    console.log(`\n📡 Testowanie: ${endpoint}`);
    console.log(`   URL: ${url}`);

    const requestData = {
      to: 'test@example.com',
      subject: 'Test zgłoszenia kontaktowego',
      data: {
        id: ticketId,
        name: 'Jan Testowy',
        email: 'test@example.com',
        phone: '+48 123 456 789',
        device: 'Laptop',
        message: 'To jest testowa wiadomość z API',
        category: 'repair_request',
        priority: 'medium',
        urgencyLevel: 'normal',
        subject: 'Test zgłoszenia',
        createdAt: new Date().toISOString(),
        clientInfo: {
          userAgent: 'Node.js Test Script',
          language: 'pl-PL',
          platform: 'Node.js',
          timestamp: Date.now()
        }
      }
    };

    try {
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify(requestData)
      });

      const duration = Date.now() - startTime;

      console.log(`   ⏱️  Czas: ${duration}ms`);
      console.log(`   📊 Status: ${response.status} ${response.statusText}`);

      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log(`   📥 Response: ${JSON.stringify(responseData, null, 2)}`);
      } else {
        responseData = await response.text();
        console.log(`   📥 Response: ${responseData.substring(0, 200)}${responseData.length > 200 ? '...' : ''}`);
      }

      if (response.ok) {
        console.log(`   ✅ SUKCES - Endpoint działa!`);
        return { success: true, endpoint, status: response.status, data: responseData };
      } else {
        console.log(`   ❌ BŁĄD - Status ${response.status}`);
        
        if (response.status === 404) {
          console.log(`   ℹ️  Endpoint nie istnieje`);
        } else if (response.status === 403) {
          console.log(`   ℹ️  Brak autoryzacji - sprawdź API key`);
        } else if (response.status === 500) {
          console.log(`   ℹ️  Błąd serwera - sprawdź logi Edge Function`);
        }
      }

    } catch (error) {
      console.log(`   ❌ BŁĄD POŁĄCZENIA: ${error.message}`);
    }
  }

  console.log('\n\n📝 Podsumowanie:');
  console.log('─────────────────────────────────────────────────────');
  console.log('Jeśli wszystkie endpointy zwróciły 404:');
  console.log('  → Edge Functions nie są wdrożone w Supabase');
  console.log('  → Musisz wdrożyć funkcje używając: supabase functions deploy');
  console.log('');
  console.log('Jeśli otrzymałeś 403:');
  console.log('  → Sprawdź czy API key jest poprawny');
  console.log('  → Sprawdź CORS w Supabase Dashboard');
  console.log('');
  console.log('Jeśli otrzymałeś 500:');
  console.log('  → Sprawdź logi Edge Function w Supabase Dashboard');
  console.log('  → Funkcja istnieje ale ma błąd w kodzie');
  console.log('');
  console.log('Aby sprawdzić w przeglądarce:');
  console.log('  1. Otwórz: test-contact-api.html');
  console.log('  2. Otwórz DevTools (F12) → Network');
  console.log('  3. Kliknij "Wyślij zgłoszenie"');
  console.log('  4. Zobacz request URL, method, status, response');
  console.log('─────────────────────────────────────────────────────');
}

testContactAPI().catch(console.error);
