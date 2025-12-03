import { createClient } from '@supabase/supabase-js'

// Enforce env-only configuration (no hardcoded fallbacks)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = '[Supabase] Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Dodaj je do pliku .env';
  console.error(msg);
  throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})
