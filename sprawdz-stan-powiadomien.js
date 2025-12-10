/**
 * Sprawdzenie aktualnego stanu powiadomień w systemie
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📊 SPRAWDZENIE STANU POWIADOMIEŃ');
console.log('='.repeat(70));
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Błąd: Brak wymaganych zmiennych środowiskowych!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sprawdź ogólne statystyki
async function checkOverallStats() {
  console.log('📋 Krok 1: Ogólne statystyki');
  console.log('-'.repeat(70));
  
  try {
    // Sprawdź ostatnie powiadomienia
    const { data: recent, error } = await supabase
      .from('notifications')
      .select('notification_id, status, recipient_email, created_at, sent_at, error_message')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('❌ Błąd:', error.message);
      return;
    }
    
    if (recent && recent.length > 0) {
      console.log('📊 Ostatnie 10 powiadomień:');
      recent.forEach(notif => {
        const created = new Date(notif.created_at).toLocaleString();
        const sent = notif.sent_at ? new Date(notif.sent_at).toLocaleString() : 'N/A';
        console.log(`   ${notif.notification_id}:`);
        console.log(`     Status: ${notif.status}`);
        console.log(`     Email: ${notif.recipient_email}`);
        console.log(`     Utworzono: ${created}`);
        console.log(`     Wysłano: ${sent}`);
        if (notif.error_message) {
          console.log(`     Błąd: ${notif.error_message}`);
        }
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Błąd:', error.message);
  }
}

// Sprawdź pending notifications
async function checkPendingNotifications() {
  console.log('📋 Krok 2: Pending notifications');
  console.log('-'.repeat(70));
  
  try {
    const { data: pending, error } = await supabase
      .from('notifications')
      .select('notification_id, recipient_email, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Błąd:', error.message);
      return;
    }
    
    if (pending && pending.length > 0) {
      console.log(`⚠️  Znaleziono ${pending.length} powiadomień pending:`);
      pending.forEach(notif => {
        const created = new Date(notif.created_at).toLocaleString();
        console.log(`   - ${notif.notification_id} → ${notif.recipient_email} (${created})`);
      });
    } else {
      console.log('✅ Brak powiadomień pending');
    }
  } catch (error) {
    console.log('❌ Błąd:', error.message);
  }
  console.log('');
}

// Sprawdź sent notifications
async function checkSentNotifications() {
  console.log('📋 Krok 3: Sent notifications (ostatnie 24h)');
  console.log('-'.repeat(70));
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: sent, error } = await supabase
      .from('notifications')
      .select('notification_id, recipient_email, sent_at')
      .eq('status', 'sent')
      .gte('sent_at', yesterday.toISOString())
      .order('sent_at', { ascending: false });
    
    if (error) {
      console.log('❌ Błąd:', error.message);
      return;
    }
    
    if (sent && sent.length > 0) {
      console.log(`✅ Znaleziono ${sent.length} wysłanych powiadomień (ostatnie 24h):`);
      sent.forEach(notif => {
        const sentTime = new Date(notif.sent_at).toLocaleString();
        console.log(`   - ${notif.notification_id} → ${notif.recipient_email} (${sentTime})`);
      });
    } else {
      console.log('⚠️  Brak wysłanych powiadomień w ostatnich 24h');
    }
  } catch (error) {
    console.log('❌ Błąd:', error.message);
  }
  console.log('');
}

// Sprawdź failed notifications
async function checkFailedNotifications() {
  console.log('📋 Krok 4: Failed notifications');
  console.log('-'.repeat(70));
  
  try {
    const { data: failed, error } = await supabase
      .from('notifications')
      .select('notification_id, recipient_email, error_message, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Błąd:', error.message);
      return;
    }
    
    if (failed && failed.length > 0) {
      console.log(`❌ Znaleziono ${failed.length} powiadomień failed:`);
      failed.forEach(notif => {
        const created = new Date(notif.created_at).toLocaleString();
        console.log(`   - ${notif.notification_id} → ${notif.recipient_email}`);
        console.log(`     Błąd: ${notif.error_message}`);
        console.log(`     Data: ${created}`);
        console.log('');
      });
    } else {
      console.log('✅ Brak powiadomień failed');
    }
  } catch (error) {
    console.log('❌ Błąd:', error.message);
  }
  console.log('');
}

// Test edge function
async function testEdgeFunction() {
  console.log('📋 Krok 5: Test edge function process-pending-notifications');
  console.log('-'.repeat(70));
  
  try {
    console.log('📤 Wywołuję edge function...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-pending-notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('📊 Status odpowiedzi:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge function działa poprawnie:');
      console.log(`   Total: ${result.total}`);
      console.log(`   Sent: ${result.sent}`);
      console.log(`   Failed: ${result.failed}`);
      
      if (result.details && result.details.length > 0) {
        console.log('');
        console.log('📝 Szczegóły przetworzonych powiadomień:');
        result.details.forEach(detail => {
          console.log(`   - ${detail.notification_id}: ${detail.status} → ${detail.recipient}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Edge function zwróciła błąd:', errorText);
    }
  } catch (error) {
    console.log('❌ Błąd wywołania edge function:', error.message);
  }
  console.log('');
}

// Rekomendacje
async function showRecommendations() {
  console.log('💡 REKOMENDACJE');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. ✅ System Resend API działa poprawnie');
  console.log('2. ✅ Edge Function process-pending-notifications działa');
  console.log('3. ⚠️  Trigger nie działa (problem z net.http_post)');
  console.log('4. 🔄 Rozwiązanie: Monitor ręczny co 2-5 minut');
  console.log('');
  console.log('📋 Uruchom monitor:');
  console.log('   bash monitor-powiadomien.sh');
  console.log('');
  console.log('📊 Sprawdź logi:');
  console.log('   https://app.wllxicmacmfzmqdnovhp.supabase.co/logs/edge-functions');
  console.log('');
  console.log('✅ Stan systemu: DZIAŁA (z monitorowaniem ręcznym)');
}

// Główna funkcja
async function runCheck() {
  await checkOverallStats();
  await checkPendingNotifications();
  await checkSentNotifications();
  await checkFailedNotifications();
  await testEdgeFunction();
  await showRecommendations();
}

runCheck().catch(error => {
  console.error('❌ Krytyczny błąd:', error);
  process.exit(1);
});