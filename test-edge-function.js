import fs from 'fs';

// Load environment variables
try {
  const envPath = '.env';
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m1 = line.match(/^VITE_SUPABASE_URL=(.*)$/);
      if (m1 && !process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = m1[1].trim();
      const m2 = line.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/);
      if (m2 && !process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = m2[1].trim();
    }
  }
} catch (e) {}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testEdgeFunction() {
  console.log('🧪 Testuję Edge Function create-booking...');
  
  const testBooking = {
    bookingId: 'BC-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    name: 'Test User',
    email: 'test@example.com',
    phone: '+48123456789',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    service: 'Diagnoza laptopa',
    duration: 60,
    price: 99,
    device: 'laptop',
    description: 'Testowa rezerwacja'
  };
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBooking)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Edge Function działa!', result);
      return true;
    } else {
      console.log('❌ Edge Function błąd:', result);
      return false;
    }
  } catch (e) {
    console.log('❌ Błąd wywołania:', e.message);
    return false;
  }
}

testEdgeFunction().then(success => {
  if (success) {
    console.log('\n🎉 System rezerwacji jest gotowy!');
    process.exit(0);
  } else {
    console.log('\n❌ Edge Function nie działa');
    process.exit(1);
  }
});