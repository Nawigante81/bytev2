import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllxicmacmfzmqdnovhp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok';

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