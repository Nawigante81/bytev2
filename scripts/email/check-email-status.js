#!/usr/bin/env node

/**
 * Szybkie sprawdzenie statusu systemu powiadomień email
 * Użycie: node scripts/email/check-email-status.js
 */

const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Błąd: Brak VITE_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('🔍 Sprawdzanie statusu systemu powiadomień email\n');
  console.log('='.repeat(60));
  
  try {
    // Pobierz statystyki z ostatnich 24 godzin
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentNotifications, error } = await supabase
      .from('notifications')
      .select('status, type, recipient_email, created_at, error_message')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Błąd odczytu tabeli notifications:', error.message);
      return;
    }
    
    // Statystyki
    const total = recentNotifications.length;
    const pending = recentNotifications.filter(n => n.status === 'pending').length;
    const sent = recentNotifications.filter(n => n.status === 'sent').length;
    const failed = recentNotifications.filter(n => n.status === 'failed').length;
    
    console.log('\n📊 STATYSTYKI (ostatnie 24 godziny)');
    console.log('-'.repeat(60));
    console.log(`Wszystkich:  ${total}`);
    console.log(`✅ Wysłanych: ${sent} (${total > 0 ? Math.round(sent/total*100) : 0}%)`);
    console.log(`⏳ Oczekujących: ${pending}`);
    console.log(`❌ Nieudanych: ${failed}`);
    
    // Sprawdź czy są problemy
    console.log('\n🔍 ANALIZA');
    console.log('-'.repeat(60));
    
    if (total === 0) {
      console.log('ℹ️  Brak powiadomień w ostatnich 24 godzinach');
      console.log('   To może oznaczać:');
      console.log('   - Brak zgłoszeń od użytkowników');
      console.log('   - Powiadomienia nie są tworzone (problem z notify-system)');
    } else {
      if (pending > 0) {
        console.log(`⚠️  Masz ${pending} powiadomień oczekujących na wysłanie!`);
        console.log('   Możliwe przyczyny:');
        console.log('   1. Brak RESEND_API_KEY w Supabase Secrets');
        console.log('   2. process-pending-notifications nie jest wywoływana automatycznie');
        console.log('   3. Problemy z Resend API');
        console.log('\n   Rozwiązanie:');
        console.log('   - Sprawdź Supabase Edge Functions Secrets');
        console.log('   - Uruchom ręcznie: curl -X POST [url]/functions/v1/process-pending-notifications');
      }
      
      if (failed > 0) {
        console.log(`❌ Masz ${failed} nieudanych powiadomień!`);
        
        // Pokaż przykładowe błędy
        const failedWithErrors = recentNotifications
          .filter(n => n.status === 'failed' && n.error_message)
          .slice(0, 3);
        
        if (failedWithErrors.length > 0) {
          console.log('\n   Przykładowe błędy:');
          failedWithErrors.forEach(n => {
            console.log(`   - ${n.recipient_email}: ${n.error_message}`);
          });
        }
        
        console.log('\n   Typowe przyczyny:');
        console.log('   1. Nieprawidłowy RESEND_API_KEY');
        console.log('   2. Limit wysyłek przekroczony (Resend Free: 100/dzień)');
        console.log('   3. Nieprawidłowy email odbiorcy');
        console.log('   4. Niezweryfikowana domena w Resend');
      }
      
      if (sent === total) {
        console.log('✅ Wszystkie powiadomienia wysłane pomyślnie!');
      }
    }
    
    // Pokaż ostatnie powiadomienia
    console.log('\n📋 OSTATNIE POWIADOMIENIA (5)');
    console.log('-'.repeat(60));
    
    recentNotifications.slice(0, 5).forEach(n => {
      const statusIcon = n.status === 'sent' ? '✅' : n.status === 'pending' ? '⏳' : '❌';
      const time = new Date(n.created_at).toLocaleString('pl-PL');
      console.log(`${statusIcon} ${n.type} → ${n.recipient_email}`);
      console.log(`   ${time} | Status: ${n.status}`);
      if (n.error_message) {
        console.log(`   Błąd: ${n.error_message}`);
      }
      console.log('');
    });
    
    // Sprawdź konfigurację
    console.log('\n⚙️  KONFIGURACJA');
    console.log('-'.repeat(60));
    console.log('Aby system działał prawidłowo, wymagane są następujące zmienne');
    console.log('w Supabase Dashboard → Settings → Edge Functions → Secrets:');
    console.log('');
    console.log('1. ADMIN_EMAIL (np. serwis@byteclinic.pl)');
    console.log('2. RESEND_API_KEY (klucz z Resend.com)');
    console.log('3. MAIL_FROM (np. serwis@byteclinic.pl)');
    console.log('');
    console.log('⚠️  WAŻNE: Po dodaniu/zmianie secrets, wdróż ponownie edge functions!');
    console.log('   supabase functions deploy notify-system');
    console.log('   supabase functions deploy process-pending-notifications');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Sprawdzanie zakończone');
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    throw error;
  }
}

// Uruchom z obsługą błędów
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Krytyczny błąd:', error.message);
    process.exit(1);
  });
