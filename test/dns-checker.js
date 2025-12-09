import dns from 'dns';
import { promisify } from 

'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

async function checkDNS(domain) {
  console.log(`\n=== Sprawdzanie DNS dla: ${domain} ===\n`);

  console.log('--- SPF ---');
  try {
    const records = await resolveTxt(domain);
    const spf = records.flat().find(r => r.includes('v=spf1'));
    if (spf) {
      console.log('✓ SPF:', spf);
      if (spf.includes('include:_spf.resend.com')) {
        console.log('  ✓ Zawiera Resend');
      } else {
        console.log('  ✗ Brak Resend - dodaj: include:_spf.resend.com');
      }
    } else {
      console.log('✗ Brak SPF');
      console.log('  Dodaj: v=spf1 include:_spf.resend.com ~all');
    }
  } catch (e) {
    console.log('✗ Błąd:', e.message);
  }

  console.log('\n--- DKIM ---');
  try {
    const dkimRecords = await resolveTxt(`resend._domainkey.${domain}`);
    if (dkimRecords.length > 0) {
      console.log('✓ DKIM skonfigurowany');
    } else {
      console.log('✗ Brak DKIM');
    }
  } catch (e)

 {
    console.log('✗ Brak DKIM - skonfiguruj w Resend Dashboard');
  }

  console.log('\n--- DMARC ---');
  try {
    const dmarcRecords = await resolveTxt(`_dmarc.${domain}`);
    const dmarc = dmarcRecords.flat().find(r => r.includes('v=DMARC1'));
    if (dmarc) {
      console.log('✓ DMARC:', dmarc);
    } else {
      console.log('✗ Brak DMARC');
      console.log('  Dodaj: v=DMARC1; p=none; rua=mailto:dmarc@' + domain);
    }
  } catch (e) {
    console.log('⚠ Brak DMARC (zalecany)');
  }

  console.log('\n--- MX ---');
  try {
    const mxRecords = await resolveMx(domain);
    if (mxRecords.length > 0) {
      console.log('✓ Rekordy MX:');
      mxRecords.forEach(mx => {
        console.log(`  - ${mx.exchange} (priority: ${mx.priority})`);
      });
    } else {
      console.log('⚠ Brak rekordów MX');
    }
  } catch (e) {
    console.log('⚠ Błąd MX:', e.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

const domain = process.argv[2] || process.env.EMAIL_DOMAIN;

if (!

domain) {
  console.error('Użycie: node dns-checker.js <domena>');
  console.error('lub ustaw EMAIL_DOMAIN w .env');
  process.exit(1);
}

checkDNS(domain);