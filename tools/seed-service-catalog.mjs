import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Lightweight .env loader (only for VITE_SUPABASE_*)
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
  console.warn('[seed-service-catalog] Failed to read .env:', e?.message || e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[seed-service-catalog] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const services = [
  { slug: 'diag-pc', title: 'Diagnoza laptop/PC', description: 'Pełna analiza HW/SW, raport + kosztorys.', active: true },
  { slug: 'czyszczenie-pasta', title: 'Czyszczenie układu chłodzenia + pasta/termopady', description: 'Rozbiórka, wymiana, test temperatur.', active: true },
  { slug: 'system-reinstall', title: 'Instalacja / konfiguracja systemu', description: 'Windows/Linux/macOS, sterowniki, pakiet startowy.', active: true },
  { slug: 'optymalizacja', title: 'Optymalizacja i usuwanie malware', description: 'Tuning, czyszczenie autostartu, zabezpieczenia.', active: true },
  { slug: 'networking', title: 'Sieci i Wi-Fi (konfiguracja/naprawa)', description: 'Routery/AP, poprawa zasięgu i bezpieczeństwa.', active: true },
  { slug: 'mobile-service', title: 'Serwis urządzeń mobilnych', description: 'Diagnoza, baterie, ekrany, gniazda.', active: true },
  { slug: 'iot-electronics', title: 'Elektronika / IoT (ESP32, Arduino)', description: 'Czujniki, sterowniki, projekty custom.', active: true },
  { slug: 'servers-virtualization', title: 'Serwery / wirtualizacja / backup', description: 'NAS, Proxmox, Docker, monitoring.', active: true },
  { slug: 'diag-online', title: 'Diagnoza online (zdalna)', description: 'Szybkie wskazanie problemu + kosztorys.', active: true },
  { slug: 'data-recovery', title: 'Odzysk danych (wstępna analiza)', description: 'Próba odzyskania danych z uszkodzonych nośników.', active: true }
];

async function main() {
  console.log('🚀 Seedowanie service_catalog...');
  
  for (const service of services) {
    // Check if service exists
    const { data: existing, error: selectError } = await supabase
      .from('service_catalog')
      .select('id, slug')
      .eq('slug', service.slug)
      .maybeSingle();
    
    if (selectError) {
      console.error(`❌ Błąd sprawdzania usługi ${service.slug}:`, selectError.message);
      continue;
    }
    
    if (existing) {
      // Update existing service
      const { error: updateError } = await supabase
        .from('service_catalog')
        .update({
          title: service.title,
          description: service.description,
          active: service.active
        })
        .eq('slug', service.slug);
      
      if (updateError) {
        console.error(`❌ Błąd aktualizacji usługi ${service.slug}:`, updateError.message);
      } else {
        console.log(`✅ Zaktualizowano: ${service.slug}`);
      }
    } else {
      // Insert new service
      const { error: insertError } = await supabase
        .from('service_catalog')
        .insert(service);
      
      if (insertError) {
        console.error(`❌ Błąd dodawania usługi ${service.slug}:`, insertError.message);
      } else {
        console.log(`✅ Dodano: ${service.slug}`);
      }
    }
  }
  
  console.log('\n✨ Seedowanie zakończone!');
}

main().catch((e) => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
