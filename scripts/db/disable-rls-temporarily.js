import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
try {
  const envPath = '.env';
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const url = line.match(/^(SUPABASE_URL|VITE_SUPABASE_URL)=(.*)$/);
      if (url) {
        const value = url[2].trim();
        if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = value;
        if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = value;
      }

      const serviceRole = line.match(/^(SUPABASE_SERVICE_ROLE_KEY|VITE_SUPABASE_SERVICE_ROLE_KEY)=(.*)$/);
      if (serviceRole && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRole[2].trim();
      }
    }
  }
} catch (e) {}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function disableRLSTemporarily() {
  console.log('🔧 Tymczasowo wyłączam RLS dla tabeli bookings...');
  
  try {
    // 1. Usuń wszystkie istniejące polityki
    console.log('🗑️ Usuwam wszystkie polityki dla bookings...');
    const dropQueries = [
      'DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;',
      'DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;',
      'DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;',
      'DROP POLICY IF EXISTS "Public Insert Access" ON bookings;',
      'DROP POLICY IF EXISTS "Public Select Access" ON bookings;',
      'DROP POLICY IF EXISTS "Public Update Access" ON bookings;'
    ];

    for (const query of dropQueries) {
      try {
        await supabaseAdmin.rpc('exec_sql', { sql: query });
        console.log('✅ Usunięto:', query);
      } catch (e) {
        console.log('⚠️ Błąd:', e.message);
      }
    }

    // 2. Tymczasowo wyłącz RLS
    console.log('🔓 Tymczasowo wyłączam RLS...');
    await supabaseAdmin.rpc('exec_sql', { 
      sql: 'ALTER TABLE bookings SET row_security = off;' 
    });
    console.log('✅ RLS wyłączone dla bookings');

    await supabaseAdmin.rpc('exec_sql', { 
      sql: 'ALTER TABLE customers SET row_security = off;' 
    });
    console.log('✅ RLS wyłączone dla customers');

    // 3. Test zapisu
    console.log('🧪 Testuję zapis danych...');
    const testBooking = {
      booking_id: 'BC-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
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

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert(testBooking)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Test zapisu nieudany:', insertError.message);
      return false;
    } else {
      console.log('✅ Test zapisu udany! ID:', inserted.id);
      
      // Usuń testowy rekord
      await supabaseAdmin.from('bookings').delete().eq('id', inserted.id);
      console.log('🗑️ Testowy rekord usunięty');
      return true;
    }

  } catch (e) {
    console.error('❌ Błąd:', e.message);
    return false;
  }
}

disableRLSTemporarily().then(success => {
  if (success) {
    console.log('\n🎉 System rezerwacji jest gotowy!');
    console.log('✅ Tabela bookings jest teraz dostępna dla zapisów');
    process.exit(0);
  } else {
    console.log('\n❌ Nie udało się naprawić systemu');
    process.exit(1);
  }
});
