#!/usr/bin/env node

/**
 * Test podstawowej rejestracji użytkownika bez Edge Functions
 * Sprawdza czy Email Auth działa w Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateTestEmail() {
  return `test.${Date.now()}@byteclinic.pl`;
}

async function testBasicRegistration() {
  console.log('🚀 TEST PODSTAWOWEJ REJESTRACJI W SUPABASE');
  console.log('=========================================');
  
  const testEmail = generateTestEmail();
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Testowy e-mail: ${testEmail}`);
  console.log(`🔑 Testowe hasło: ${testPassword}`);
  console.log('');
  
  try {
    // Test 1: Sprawdź połączenie
    console.log('1️⃣ Test połączenia z Supabase...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Błąd połączenia:', sessionError.message);
      return;
    }
    console.log('✅ Połączenie działa');
    
    // Test 2: Próba rejestracji
    console.log('\n2️⃣ Test rejestracji użytkownika...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:5173/panel'
      }
    });
    
    if (signUpError) {
      console.log('❌ BŁĄD REJESTRACJI:', signUpError.message);
      
      // Sprawdź czy to błąd SMTP
      if (signUpError.message.toLowerCase().includes('email') || 
          signUpError.message.toLowerCase().includes('smtp')) {
        console.log('\n🚨 DIAGNOZA: Problem z konfiguracją Email Auth!');
        console.log('✅ Kod aplikacji działa poprawnie');
        console.log('❌ Supabase nie może wysłać e-mail weryfikacyjnego');
        console.log('\n🔧 WYMAGANE KROKI:');
        console.log('1. Przejdź do: https://supabase.com/dashboard');
        console.log('2. Wybierz projekt: glwqpjqvivzkbbvluxdd');
        console.log('3. Authentication → Settings → Email Auth');
        console.log('4. Włącz: "Enable email confirmations"');
        console.log('5. Sprawdź SMTP Settings');
      }
      return;
    }
    
    // Jeśli rejestracja się powiodła
    console.log('✅ Rejestracja zakończona pomyślnie');
    console.log('\n📊 WYNIKI:');
    console.log('✅ Użytkownik utworzony:', !!signUpData.user);
    console.log('📧 Email confirmed:', signUpData.user?.email_confirmed_at ? 'TAK' : 'NIE');
    console.log('📅 Confirmation sent at:', signUpData.user?.confirmation_sent_at || 'NIE WYSŁANO');
    console.log('🎯 Email confirmation flow:', signUpData.user?.confirmation_sent_at ? 'DZIAŁA' : 'NIE DZIAŁA');
    
    if (!signUpData.user?.email_confirmed_at && !signUpData.user?.confirmation_sent_at) {
      console.log('\n🚨 PROBLEM: E-mail weryfikacyjny NIE zostal wysłany!');
      console.log('🔧 Sprawdź konfigurację Email Auth w panelu Supabase');
    }
    
  } catch (error) {
    console.log('💥 NIEOCZEKIWANY BŁĄD:', error.message);
  }
  
  console.log('\n🎯 PODSUMOWANIE');
  console.log('================');
  console.log('Jeśli rejestracja się powiodła ale e-mail nie dotarł:');
  console.log('→ Problem jest w konfiguracji Supabase Email Auth');
  console.log('→ Sprawdź panel: Authentication → Settings → Email Auth');
  console.log('→ Włącz "Enable email confirmations"');
  console.log('→ Sprawdź SMTP Settings');
}

testBasicRegistration();
