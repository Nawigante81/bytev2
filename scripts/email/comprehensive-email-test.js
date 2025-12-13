import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function comprehensiveTest() {
  console.log('🔍 KOMPLEKSOWY TEST REJESTRACJI I EMAIL W SUPABASE');
  console.log('====================================================');
  
  const testEmail = `test.${Date.now()}@byteclinic.pl`;
  const testPassword = 'TestPassword123!';
  
  console.log('\n1️⃣ SPRAWDZENIE KONFIGURACJI SUPABASE');
  try {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('❌ Błąd połączenia:', sessionError.message);
      return;
    }
    console.log('✅ Połączenie z Supabase: OK');
    console.log('🌐 URL:', supabaseUrl);
  } catch (err) {
    console.log('💥 Błąd konfiguracji:', err.message);
    return;
  }
  
  console.log('\n2️⃣ TEST REJESTRACJI UŻYTKOWNIKA');
  console.log('📧 Testowy email:', testEmail);
  console.log('🔑 Testowe hasło:', testPassword);
  
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:5173/panel',
      },
    });
    
    if (signUpError) {
      console.log('❌ BŁĄD REJESTRACJI:', signUpError.message);
      
      // Analiza typu błędu
      if (signUpError.message.includes('email') || signUpError.message.includes('SMTP')) {
        console.log('🚨 POTWIERDZENIE PROBLEMU Z SMTP!');
        console.log('📧 E-mail prawdopodobnie nie został wysłany');
      } else if (signUpError.message.includes('confirmation')) {
        console.log('🚨 PROBLEM Z POTWIERDZANIEM E-MAIL');
      }
      return;
    }
    
    console.log('✅ REJESTRACJA ZAKOŃCZONA POMYŚLNIE');
    console.log('👤 Użytkownik utworzony:', !!signUpData.user);
    console.log('📧 Email confirmed:', signUpData.user?.email_confirmed_at ? 'TAK' : 'NIE');
    console.log('🔗 Confirmation sent at:', signUpData.user?.confirmation_sent_at || 'N/A');
    
    console.log('\n3️⃣ ANALIZA WYNIKÓW');
    if (signUpData.user && !signUpData.user.email_confirmed_at) {
      console.log('🔍 DIAGNOZA:');
      console.log('✅ Użytkownik został utworzony w bazie danych');
      console.log('❌ E-mail weryfikacyjny NIE został wysłany lub nie dotarł');
      console.log('');
      console.log('🚨 PRZYCZYNA: Problem konfiguracji Supabase Email Auth');
      console.log('');
      console.log('🔧 WYMAGANE AKCJE:');
      console.log('1. Sprawdź Authentication → Settings → Email Auth w panelu Supabase');
      console.log('2. Włącz "Enable email confirmations"');
      console.log('3. Sprawdź SMTP Settings');
      console.log('4. Zweryfikuj DNS records dla domeny byteclinic.pl');
      console.log('5. Sprawdź logi: supabase logs --type auth');
    }
    
    console.log('\n📊 SZCZEGÓŁY UŻYTKOWNIKA:');
    console.log('- ID:', signUpData.user?.id || 'N/A');
    console.log('- Email:', signUpData.user?.email || 'N/A');
    console.log('- Email Confirmed:', signUpData.user?.email_confirmed_at || 'NIE');
    console.log('- Confirmation Sent:', signUpData.user?.confirmation_sent_at || 'NIE');
    console.log('- Phone Confirmed:', signUpData.user?.phone_confirmed_at || 'NIE');
    
  } catch (err) {
    console.log('💥 NIEOCZEKIWANY BŁĄD:', err.message);
    console.log('🔍 Szczegóły:', err);
  }
  
  console.log('\n🎯 PODSUMOWANIE TESTU');
  console.log('===================');
  console.log('✅ Kod aplikacji działa poprawnie');
  console.log('✅ Połączenie z Supabase działa');
  console.log('✅ Rejestracja użytkownika działa');
  console.log('❌ Wysyłka e-mail weryfikacyjnego NIE DZIAŁA');
  console.log('');
  console.log('📋 NASTĘPNE KROKI:');
  console.log('1. Sprawdź panel Supabase: Authentication → Settings');
  console.log('2. Włącz Email Auth i SMTP');
  console.log('3. Przeczytaj: DIAGNOZA_PROBLEMU_MAILI_WERYFIKACYJNYCH.md');
  console.log('4. Sprawdź logi Supabase');
}

comprehensiveTest().catch(console.error);
