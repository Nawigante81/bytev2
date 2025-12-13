/**
 * Skrypt diagnostyczny systemu emailowego
 * Sprawdza konfigurację i pomaga zidentyfikować problemy
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

console.log('🔍 DIAGNOSTYKA SYSTEMU EMAILOWEGO');
console.log('='.repeat(60));
console.log('');

// Sprawdź zmienne środowiskowe
console.log('📋 Krok 1: Zmienne środowiskowe (.env)');
console.log('-'.repeat(60));
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Ustawiona' : '❌ BRAK');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Ustawiona' : '❌ BRAK');
console.log('RESEND_API_KEY:', resendApiKey ? `✅ Ustawiona (${resendApiKey.substring(0, 10)}...)` : '❌ BRAK');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ BŁĄD: Brak wymaganych zmiennych środowiskowych!');
  console.log('💡 Ustaw je w pliku .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEdgeFunctionExists() {
  console.log('📋 Krok 2: Edge Functions');
  console.log('-'.repeat(60));
  
  const functionsToCheck = [
    'notify-system',
    'process-pending-notifications',
    'send-email-resend'
  ];
  
  for (const funcName of functionsToCheck) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${funcName}`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      });
      
      if (response.status === 200 || response.status === 204) {
        console.log(`✅ ${funcName}: Wdrożona i dostępna`);
      } else {
        console.log(`⚠️  ${funcName}: Odpowiedź ${response.status} (może nie być wdrożona)`);
      }
    } catch (error) {
      console.log(`❌ ${funcName}: Błąd połączenia - ${error.message}`);
    }
  }
  console.log('');
}

async function checkNotificationsTable() {
  console.log('📋 Krok 3: Tabela notifications');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('notification_id, status, recipient_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Błąd odczytu tabeli:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  Tabela jest pusta - brak powiadomień w kolejce');
    } else {
      console.log(`✅ Znaleziono ${data.length} ostatnich powiadomień:`);
      data.forEach(n => {
        console.log(`   - ${n.notification_id}: ${n.status} → ${n.recipient_email}`);
      });
      
      // Sprawdź statusy
      const pending = data.filter(n => n.status === 'pending').length;
      const sent = data.filter(n => n.status === 'sent').length;
      const failed = data.filter(n => n.status === 'failed').length;
      
      console.log('');
      console.log(`   Pending: ${pending} | Sent: ${sent} | Failed: ${failed}`);
    }
  } catch (error) {
    console.log('❌ Błąd:', error.message);
  }
  console.log('');
}

async function testNotifySystem() {
  console.log('📋 Krok 4: Test Edge Function notify-system');
  console.log('-'.repeat(60));
  
  try {
    const testData = {
      template: 'repair_request',
      recipient: 'test@example.com',
      sendAdminCopy: true,
      data: {
        id: 'TEST-' + Date.now(),
        name: 'Test User',
        email: 'test@example.com',
        phone: '+48 123 456 789',
        device: 'Test Device',
        message: 'To jest test diagnostyczny systemu'
      }
    };
    
    console.log('📤 Wysyłam testowe zgłoszenie...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Edge function odpowiedziała poprawnie');
      console.log('📊 Odpowiedź:', JSON.stringify(result, null, 2));
      
      if (result.notifications && result.notifications.length > 0) {
        console.log('');
        console.log('✅ Utworzono powiadomienia:');
        result.notifications.forEach(n => {
          console.log(`   - ${n.notification_id}`);
        });
      }
    } else {
      console.log('❌ Edge function zwróciła błąd:', response.status);
      console.log('📊 Szczegóły:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ Błąd wywołania edge function:', error.message);
  }
  console.log('');
}

async function checkSupabaseSecrets() {
  console.log('📋 Krok 5: Supabase Secrets (wymaga weryfikacji manualnej)');
  console.log('-'.repeat(60));
  console.log('⚠️  Nie można automatycznie sprawdzić secrets w Supabase.');
  console.log('');
  console.log('📝 Zweryfikuj manualnie w Supabase Dashboard:');
  console.log(`   ${supabaseUrl.replace('//', '//app.')}/settings/functions`);
  console.log('');
  console.log('Wymagane secrets:');
  console.log('   ✓ RESEND_API_KEY');
  console.log('   ✓ MAIL_FROM (opcjonalne, domyślnie: onboarding@resend.dev)');
  console.log('   ✓ ADMIN_EMAIL (opcjonalne, domyślnie: serwis@byteclinic.pl)');
  console.log('');
}

async function checkResendAPI() {
  console.log('📋 Krok 6: Test Resend API (z lokalnego .env)');
  console.log('-'.repeat(60));
  
  if (!resendApiKey) {
    console.log('⚠️  Brak RESEND_API_KEY w .env - pomijam test');
    console.log('');
    return;
  }
  
  try {
    console.log('🔑 Testuję klucz API Resend...');
    
    // Test: sprawdź czy klucz jest poprawny
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'delivered@resend.dev', // Specjalny adres testowy Resend
        subject: 'Test diagnostyczny ByteClinic',
        html: '<p>To jest test połączenia z Resend API</p>'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Klucz API Resend działa poprawnie!');
      console.log('📧 Email testowy wysłany (ID:', result.id + ')');
      console.log('');
      console.log('💡 UWAGA: To był test z LOKALNEGO .env');
      console.log('   Edge functions używają kluczy z Supabase Secrets!');
    } else {
      const error = await response.text();
      console.log('❌ Błąd Resend API:', response.status);
      console.log('📊 Odpowiedź:', error);
      
      if (response.status === 403 || response.status === 401) {
        console.log('');
        console.log('⚠️  To może oznaczać:');
        console.log('   1. Klucz API jest nieprawidłowy');
        console.log('   2. Klucz API wygasł');
        console.log('   3. Brak uprawnień do wysyłki');
      }
    }
  } catch (error) {
    console.log('❌ Błąd połączenia z Resend:', error.message);
  }
  console.log('');
}

async function showRecommendations() {
  console.log('='.repeat(60));
  console.log('💡 REKOMENDACJE');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Sprawdź Supabase Secrets (Krok 5)');
  console.log('   - RESEND_API_KEY musi być ustawiony w Supabase');
  console.log('   - To NIE jest ten sam klucz co w .env!');
  console.log('');
  console.log('2. Sprawdź logi Edge Functions:');
  console.log(`   ${supabaseUrl.replace('//', '//app.')}/logs/edge-functions`);
  console.log('');
  console.log('3. Jeśli tabela notifications ma wpisy "pending":');
  console.log('   - System trigger+edge function może nie działać');
  console.log('   - Uruchom: node test-auto-notifications.js');
  console.log('');
  console.log('4. Wdróż ponownie edge functions:');
  console.log('   supabase functions deploy notify-system');
  console.log('   supabase functions deploy process-pending-notifications');
  console.log('');
  console.log('5. Sprawdź domenę w Resend Dashboard:');
  console.log('   https://resend.com/domains');
  console.log('   - Czy byteclinic.pl jest zweryfikowana?');
  console.log('');
}

// Uruchom diagnostykę
async function runDiagnostics() {
  await checkEdgeFunctionExists();
  await checkNotificationsTable();
  await testNotifySystem();
  await checkSupabaseSecrets();
  await checkResendAPI();
  await showRecommendations();
  
  console.log('✅ Diagnostyka zakończona!');
  console.log('');
}

runDiagnostics().catch(error => {
  console.error('❌ Krytyczny błąd diagnostyki:', error);
  process.exit(1);
});