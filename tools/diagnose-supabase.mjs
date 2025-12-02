import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Lightweight .env loader (only for VITE_SUPABASE_*), avoids extra deps
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
  console.warn('[diagnose-supabase] Failed to read .env:', e?.message || e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[diagnose-supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Testing Supabase connectivity...');
  try {
    const { data: versionData, error: versionError } = await supabase.rpc('version');
    if (versionError) {
      console.log('RPC version not available:', versionError.message);
    } else {
      console.log('Postgres version:', versionData);
    }
  } catch (e) {
    console.error('RPC call failed:', e?.message || e);
  }

  try {
    const { data, error, count } = await supabase
      .from('diagnosis_requests')
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error('RLS or table error for diagnosis_requests:', error);
    } else {
      console.log('diagnosis_requests accessible, count:', count, 'rows');
    }
  } catch (e) {
    console.error('Query failed:', e?.message || e);
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth getSession error:', authError);
    } else {
      console.log('Auth session:', authData?.session ? 'exists' : 'none');
    }
  } catch (e) {
    console.error('Auth call failed:', e?.message || e);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
});
