import { createClient } from '@supabase/supabase-js'

// Enforce env-only configuration (no hardcoded fallbacks)
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError = isSupabaseConfigured
  ? null
  : '[Supabase] Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Dodaj je do pliku .env';

if (!isSupabaseConfigured) {
  console.error(supabaseConfigError);
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
