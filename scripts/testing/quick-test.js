import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  const testEmail = `test.${Date.now()}@byteclinic.pl`;
  const testPassword = 'TestPassword123!';
  
  console.log('🚀 Test rejestracji w Supabase');
  console.log('Email:', testEmail);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:5173/panel',
      },
    });
    
    if (error) {
      console.log('❌ Błąd:', error.message);
      if (error.message.includes('email')) {
        console.log('🚨 POTWIERDZENIE: Problem z wysyłką e-mail!');
      }
    } else {
      console.log('✅ Rejestracja udana!');
      console.log('👤 Użytkownik:', data.user ? 'utworzony' : 'nie utworzony');
      console.log('📧 Email confirmed:', data.user?.email_confirmed_at ? 'TAK' : 'NIE');
    }
  } catch (err) {
    console.log('💥 Błąd:', err.message);
  }
}

testSignup();
