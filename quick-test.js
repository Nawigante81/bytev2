import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://glwqpjqvivzkbbvluxdd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsd3FwanF2aXZ6a2Jidmx1eGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzQ0NDYsImV4cCI6MjA3NzE1MDQ0Nn0.rxdXK0JNSBt65EGxU1Mb0d-Up0WBq3c6pz6dCvGy5yc';

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