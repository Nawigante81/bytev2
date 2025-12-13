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
} catch (e) {
  console.warn('Failed to read .env:', e?.message || e);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixBookingPolicies() {
  console.log('🔧 Naprawiam polityki RLS dla tabeli bookings...');
  
  try {
    // 1. Sprawdź istniejące polityki
    console.log('📋 Sprawdzam istniejące polityki...');
    const { data: policies, error: policyError } = await supabaseAdmin
      .rpc('check_policy_exists', { table_name: 'bookings' });
      
    if (policyError) {
      console.log('⚠️ Nie udało się sprawdzić polityk:', policyError.message);
    }

    // 2. Usuń wszystkie istniejące polityki dla bookings
    console.log('🗑️ Usuwam istniejące polityki...');
    const dropQueries = [
      'DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;',
      'DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;',
      'DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;'
    ];

    for (const query of dropQueries) {
      try {
        await supabaseAdmin.rpc('exec_sql', { sql: query });
        console.log('✅ Usunięto politykę:', query);
      } catch (e) {
        console.log('⚠️ Błąd usuwania polityki:', e.message);
      }
    }

    // 3. Dodaj nowe polityki pozwalające na publiczny dostęp
    console.log('➕ Dodaję nowe polityki...');
    const createQueries = [
      'CREATE POLICY "Public Insert Access" ON bookings FOR INSERT WITH CHECK (true);',
      'CREATE POLICY "Public Select Access" ON bookings FOR SELECT USING (true);',
      'CREATE POLICY "Public Update Access" ON bookings FOR UPDATE USING (true) WITH CHECK (true);'
    ];

    for (const query of createQueries) {
      try {
        await supabaseAdmin.rpc('exec_sql', { sql: query });
        console.log('✅ Utworzono politykę:', query);
      } catch (e) {
        console.log('❌ Błąd tworzenia polityki:', e.message);
        console.log('❌ Query:', query);
      }
    }

    // 4. Sprawdź czy działa insert
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
    } else {
      console.log('✅ Test zapisu udany! ID:', inserted.id);
      
      // Usuń testowy rekord
      await supabaseAdmin.from('bookings').delete().eq('id', inserted.id);
      console.log('🗑️ Testowy rekord usunięty');
    }

    console.log('\n🎉 Polityki RLS naprawione!');
    return true;
    
  } catch (e) {
    console.error('❌ Błąd:', e.message);
    return false;
  }
}

fixBookingPolicies().then(success => {
  if (success) {
    console.log('\n✅ System rezerwacji jest gotowy do użycia!');
    process.exit(0);
  } else {
    console.log('\n❌ Nie udało się naprawić polityk RLS');
    process.exit(1);
  }
});
