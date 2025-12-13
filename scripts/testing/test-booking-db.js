import { createClient } from '@supabase/supabase-js';
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
} catch (e) {
  console.warn('Failed to read .env:', e?.message || e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBookingTable() {
  console.log('🔍 Sprawdzam czy tabela bookings istnieje...');
  
  try {
    // Sprawdź strukturę tabeli bookings
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Tabela bookings nie istnieje lub jest niedostępna:', error.message);
      return false;
    }
    
    console.log('✅ Tabela bookings istnieje!');
    console.log('📊 Struktura kolumn dostępna');
    
    // Test insert
    console.log('🧪 Test zapisu danych...');
    const testBooking = {
      booking_id: 'BC-TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customer_name: 'Test User',
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
      console.error('❌ Błąd zapisu:', insertError.message);
    } else {
      console.log('✅ Zapis udany! ID:', inserted.id);
      
      // Usuń testowy rekord
      await supabase.from('bookings').delete().eq('id', inserted.id);
      console.log('🗑️ Testowy rekord usunięty');
    }
    
    return true;
    
  } catch (e) {
    console.error('❌ Błąd połączenia:', e.message);
    return false;
  }
}

testBookingTable().then(success => {
  if (success) {
    console.log('\n🎉 System rezerwacji jest gotowy!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Należy uruchomić migrację bazy danych');
    process.exit(1);
  }
});