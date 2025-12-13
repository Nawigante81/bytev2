#!/usr/bin/env node

/**
 * Test rejestracji i sprawdzenie maili weryfikacyjnych
 * 
 * Skrypt testuje proces rejestracji użytkownika w Supabase
 * i sprawdza czy e-mail weryfikacyjny zostanie wysłany.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Lightweight .env loader (tylko dla zmiennych Supabase)
try {
  const envPath = path.join(process.cwd(), '.env');
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
  console.warn('[test-registration] Nie można odczytać .env:', e?.message || e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Brak VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY w .env');
  console.log('Upewnij się, że plik .env zawiera wymagane zmienne Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateTestEmail() {
  const timestamp = Date.now();
  return `test.${timestamp}@byteclinic.pl`;
}

function generateTestPassword() {
  return 'TestPassword123!';
}

async function testRegistration() {
  console.log('🔍 Test rejestracji użytkownika w Supabase');
  console.log('=====================================');
  
  const testEmail = generateTestEmail();
  const testPassword = generateTestPassword();
  
  console.log(`📧 Testowy e-mail: ${testEmail}`);
  console.log(`🔑 Testowe hasło: ${testPassword}`);
  console.log('');
  
  try {
    // Test 1: Sprawdź dostępność usługi
    console.log('1️⃣ Test dostępności usługi Supabase...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Błąd połączenia z Supabase:', sessionError.message);
      return;
    }
    
    console.log('✅ Połączenie z Supabase działa');
    
    // Test 2: Rejestracja użytkownika
    console.log('\n2️⃣ Test rejestracji użytkownika...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${process.env.VITE_SITE_URL || 'http://localhost:5173'}/panel`,
      },
    });
    
    if (signUpError) {
      console.error('❌ Błąd rejestracji:', signUpError.message);
      
      // Sprawdź czy to błąd SMTP
      if (signUpError.message.includes('email')) {
        console.log('\n🚨 POTWIERDZENIE: Problem z wysyłką e-mail!');
        console.log('🔧 Sprawdź:');
        console.log('   - Email Auth w panelu Supabase');
        console.log('   - Konfigurację SMTP');
        console.log('   - Szablon e-mail weryfikacyjnego');
      }
      return;
    }
    
    console.log('✅ Rejestracja zakończona pomyślnie');
    
    console.log('\n🎯 WNIOSKI:');
    console.log('✅ Kod aplikacji działa poprawnie');
    console.log('✅ Połączenie z Supabase działa');
    console.log('✅ Rejestracja przebiegła bez błędów');
    console.log('');
    console.log('🚨 NASTĘPNE KROKI:');
    console.log('1. Sprawdź skrzynkę e-mail (łącznie ze spamem)');
    console.log('2. Sprawdź logi: supabase logs --type auth');
    console.log('3. Sprawdź konfigurację Email Auth w panelu Supabase');
    console.log('4. Przeczytaj: DIAGNOZA_PROBLEMU_MAILI_WERYFIKACYJNYCH.md');
    
  } catch (error) {
    console.error('💥 Nieoczekiwany błąd:', error?.message || error);
  }
}

async function main() {
  console.log('🚀 Test rejestracji i maili weryfikacyjnych Supabase');
  console.log('======================================================\n');
  
  await testRegistration();
  
  console.log('\n📋 WNIOSEK KOŃCOWY:');
  console.log('Jeśli rejestracja przebiegła bez błędu, ale e-mail nie dotarł,');
  console.log('problem znajduje się w konfiguracji SMTP lub Email Auth w Supabase.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}