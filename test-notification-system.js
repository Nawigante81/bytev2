#!/usr/bin/env node

/**
 * Testowy skrypt dla systemu powiadomień
 * Weryfikuje działanie całego procesu: od dodania powiadomienia do wysłania emaila
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Wczytaj konfigurację
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Brak konfiguracji Supabase. Ustaw SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testNotificationSystem() {
  console.log('🧪 Rozpoczynanie testu systemu powiadomień...');

  try {
    // Krok 1: Sprawdź czy trigger istnieje
    console.log('\n1. Sprawdzanie triggera...');
    const { data: triggerData, error: triggerError } = await supabase
      .rpc('check_trigger_exists', { trigger_name: 'auto_process_notifications' });

    if (triggerError) {
      console.error('❌ Błąd sprawdzania triggera:', triggerError.message);
      return false;
    }

    if (!triggerData.exists) {
      console.error('❌ Trigger auto_process_notifications nie istnieje');
      console.log('💡 Uruchom migrację: supabase/migrations/20251210_setup_auto_notifications.sql');
      return false;
    }

    console.log('✅ Trigger istnieje i jest aktywny');

    // Krok 2: Dodaj testowe powiadomienie
    console.log('\n2. Dodawanie testowego powiadomienia...');
    const testNotification = {
      notification_id: `test_${Date.now()}`,
      type: 'test',
      recipient_email: 'test@example.com',
      recipient_name: 'Test User',
      subject: 'Test Notification',
      html_content: '<p>This is a test notification</p>',
      text_content: 'This is a test notification',
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      data: { test: true },
      metadata: { source: 'test_script' }
    };

    const { data: notificationData, error: notificationError } = await supabase
      .from('notifications')
      .insert([testNotification])
      .select();

    if (notificationError) {
      console.error('❌ Błąd dodawania powiadomienia:', notificationError.message);
      return false;
    }

    console.log('✅ Powiadomienie dodane:', notificationData[0].notification_id);

    // Krok 3: Poczekaj na przetworzenie (5 sekund)
    console.log('\n3. Oczekiwanie na przetworzenie...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Krok 4: Sprawdź status powiadomienia
    console.log('\n4. Sprawdzanie statusu powiadomienia...');
    const { data: updatedNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('notification_id', testNotification.notification_id)
      .single();

    if (fetchError) {
      console.error('❌ Błąd pobierania statusu:', fetchError.message);
      return false;
    }

    console.log('📊 Status powiadomienia:', updatedNotification.status);

    if (updatedNotification.status === 'sent') {
      console.log('✅ Powiadomienie zostało wysłane pomyślnie!');
      console.log('📧 Email wysłany do:', updatedNotification.recipient_email);
      return true;
    } else if (updatedNotification.status === 'failed') {
      console.error('❌ Wysyłka powiadomienia nie powiodła się');
      console.error('💡 Błąd:', updatedNotification.error_message);
      return false;
    } else {
      console.warn('⚠️ Powiadomienie nadal w statusie "pending"');
      console.log('💡 Możliwe przyczyny:');
      console.log('   - Trigger nie działa poprawnie');
      console.log('   - Brak konfiguracji RESEND_API_KEY/MAIL_FROM');
      console.log('   - Problem z połączeniem do Resend API');
      return false;
    }

  } catch (error) {
    console.error('❌ Nieoczekiwany błąd:', error.message);
    return false;
  }
}

// Uruchom test
testNotificationSystem().then(success => {
  if (success) {
    console.log('\n🎉 Test zakończony sukcesem!');
    process.exit(0);
  } else {
    console.log('\n💡 Sugestie naprawy:');
    console.log('   1. Sprawdź czy trigger został poprawnie utworzony');
    console.log('   2. Upewnij się, że pg_net jest włączone');
    console.log('   3. Skonfiguruj RESEND_API_KEY i MAIL_FROM w Supabase Secrets');
    console.log('   4. Sprawdź logi w Supabase Dashboard > Logs');
    process.exit(1);
  }
});