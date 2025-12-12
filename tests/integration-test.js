import { createClient } from '@supabase/supabase-js';
import dns from 'dns';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class IntegrationTester {
  constructor(config) {
    this.config = config;
    this.results = {
      passed: 0,
      failed: 0,
      warningCount: 0,
      errors: [],
      warnings: [],
      success: []
    };
    this.supabase = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      success: colors.green,
      error: colors.red,
      warning: colors.yellow,
      info: colors.cyan
    };
    console.log(`${colorMap[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async testSupabaseConnection() {
    this.log('=== TESTY SUPABASE ===', 'info');

    try {
      const { supabaseUrl, supabaseAnonKey } = this.config;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Brak konfiguracji Supabase (URL lub ANON_KEY)');
      }

      this.supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await this.supabase.auth.getSession();

      if (error && error.message !== 'Auth session missing!') {
        throw error;
      }

      this.log('✓ Połączenie z Supabase działa', 'success');
      this.results.passed++;
      this.results.success.push('Supabase: Połączenie OK');

      return true;
    } catch (error) {
      this.log(`✗ Błąd połączenia z Supabase: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Supabase Connection: ${error.message}`);
      return false;
    }
  }

  async testSupabaseAuth() {
    this.log('\n--- Test autoryzacji Supabase ---', 'info');

    try {
      if (!this.supabase) {
        this.log('? Brak połączenia z Supabase - pomijam test autoryzacji', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('Supabase Auth: Pominięto (brak konfiguracji/połączenia)');
        return true;
      }

      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!@#';

      const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      if (signUpError) {
        if (signUpError.message.includes('Email rate limit exceeded')) {
          this.log('⚠ Rate limit - pomijam test rejestracji', 'warning');
          this.results.warningCount++;
          this.results.warnings.push('Supabase Auth: Rate limit exceeded');
          return true;
        }
        throw signUpError;
      }

      this.log('✓ Rejestracja użytkownika działa', 'success');
      this.results.passed++;
      this.results.success.push('Supabase Auth: Rejestracja OK');

      if (signUpData.user) {
        const { error: signOutError } = await this.supabase.auth.signOut();
        if (!signOutError) {
          this.log('✓ Wylogowanie działa', 'success');
          this.results.passed++;
          this.results.success.push('Supabase Auth: Wylogowanie OK');
        }
      }

      return true;
    } catch (error) {
      this.log(`✗ Błąd autoryzacji: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Supabase Auth: ${error.message}`);
      return false;
    }
  }

  async testSupabaseDatabase() {
    this.log('\n--- Test bazy danych Supabase ---', 'info');

    try {
      if (!this.supabase) {
        this.log('? Brak połączenia z Supabase - pomijam test bazy danych', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('Supabase DB: Pominięto (brak konfiguracji/połączenia)');
        return true;
      }

      const { data, error, count } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          this.log('⚠ Tabela "profiles" nie istnieje', 'warning');
          this.results.warningCount++;
          this.results.warnings.push('Supabase DB: Tabela profiles nie istnieje');
          return true;
        }
        throw error;
      }

      this.log('✓ Odczyt z bazy danych działa', 'success');
      this.results.passed++;
      this.results.success.push('Supabase DB: Odczyt OK');

      return true;
    } catch (error) {
      this.log(`✗ Błąd bazy danych: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Supabase DB: ${error.message}`);
      return false;
    }
  }

  async testSupabaseRLS() {
    this.log('\n--- Test Row Level Security ---', 'info');

    try {
      if (!this.supabase) {
        this.log('? Brak połączenia z Supabase - pomijam test RLS', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('Supabase RLS: Pominięto (brak konfiguracji/połączenia)');
        return true;
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (error && error.code === '42501') {
        this.log('✓ RLS jest aktywne (brak uprawnień bez autoryzacji)', 'success');
        this.results.passed++;
        this.results.success.push('Supabase RLS: Aktywne');
        return true;
      }

      if (!error) {
        this.log('⚠ RLS może być wyłączone lub polityki są zbyt permisywne', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('Supabase RLS: Możliwe problemy z politykami');
      }

      return true;
    } catch (error) {
      this.log(`✗ Błąd sprawdzania RLS: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Supabase RLS: ${error.message}`);
      return false;
    }
  }

  async testResendAPI() {
    this.log('\n=== TESTY RESEND ===', 'info');

    try {
      const { resendApiKey } = this.config;

      if (!resendApiKey) {
        throw new Error('Brak RESEND_API_KEY');
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.config.mailFrom || 'onboarding@resend.dev',
          to: this.config.testEmail || 'test@example.com',
          subject: 'Test Email - Integration Test',
          html: '<p>This is a test email from integration tests.</p>'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message && data.message.includes('API key')) {
          throw new Error('Nieprawidłowy klucz API Resend');
        }
        throw new Error(data.message || 'Błąd wysyłki email');
      }

      this.log('✓ Wysyłka email przez Resend działa', 'success');
      this.log(`  Email ID: ${data.id}`, 'info');
      this.results.passed++;
      this.results.success.push(`Resend: Email wysłany (ID: ${data.id})`);

      return true;
    } catch (error) {
      this.log(`✗ Błąd Resend API: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Resend API: ${error.message}`);
      return false;
    }
  }

  async testSupabaseEdgeFunction() {
    this.log('\n--- Test Supabase Edge Function (send-email-resend) ---', 'info');

    try {
      const { supabaseUrl, supabaseAnonKey } = this.config;

      if (!supabaseUrl || !supabaseAnonKey) {
        this.log('? Brak konfiguracji Supabase - pomijam test Edge Function', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('Edge Function: Pominięto (brak konfiguracji Supabase)');
        return true;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-email-resend`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: this.config.testEmail || 'test@example.com',
            subject: 'Test from Edge Function',
            html: '<p>Test email from Supabase Edge Function</p>'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          this.log('⚠ Edge Function nie jest wdrożona', 'warning');
          this.results.warningCount++;
          this.results.warnings.push('Edge Function: Nie wdrożona');
          return true;
        }
        throw new Error(data.error || 'Błąd Edge Function');
      }

      this.log('✓ Edge Function działa poprawnie', 'success');
      this.results.passed++;
      this.results.success.push('Edge Function: OK');

      return true;
    } catch (error) {
      this.log(`✗ Błąd Edge Function: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Edge Function: ${error.message}`);
      return false;
    }
  }

  async testDNSRecords() {
    this.log('\n=== TESTY DNS ===', 'info');

    const domain = this.config.emailDomain;

    if (!domain) {
      this.log('⚠ Brak domeny email - pomijam testy DNS', 'warning');
      this.results.warningCount++;
      this.results.warnings.push('DNS: Brak konfiguracji domeny');
      return true;
    }

    try {
      const spfRecords = await resolveTxt(domain);
      const spfRecord = spfRecords.flat().find(r => r.includes('v=spf1'));

      if (spfRecord) {
        this.log(`✓ Rekord SPF znaleziony: ${spfRecord}`, 'success');
        this.results.passed++;
        this.results.success.push('DNS: SPF OK');

        if (spfRecord.includes('include:_spf.resend.com')) {
          this.log('  ✓ SPF zawiera Resend', 'success');
        } else {
          this.log('  ⚠ SPF nie zawiera Resend (_spf.resend.com)', 'warning');
          this.results.warningCount++;
          this.results.warnings.push('DNS: SPF bez Resend');
        }
      } else {
        this.log('✗ Brak rekordu SPF', 'error');
        this.results.failed++;
        this.results.errors.push('DNS: Brak SPF');
      }
    } catch (error) {
      this.log(`✗ Błąd sprawdzania SPF: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`DNS SPF: ${error.message}`);
    }

    try {
      const dkimSelector = 'resend._domainkey';
      const dkimRecords = await resolveTxt(`${dkimSelector}.${domain}`);

      if (dkimRecords && dkimRecords.length > 0) {
        this.log('✓ Rekord DKIM znaleziony', 'success');
        this.results.passed++;
        this.results.success.push('DNS: DKIM OK');
      } else {
        this.log('✗ Brak rekordu DKIM', 'error');
        this.results.failed++;
        this.results.errors.push('DNS: Brak DKIM');
      }
    } catch (error) {
      this.log(`✗ Błąd sprawdzania DKIM: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`DNS DKIM: ${error.message}`);
    }

    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = dmarcRecords.flat().find(r => r.includes('v=DMARC1'));

      if (dmarcRecord) {
        this.log(`✓ Rekord DMARC znaleziony: ${dmarcRecord}`, 'success');
        this.results.passed++;
        this.results.success.push('DNS: DMARC OK');
      } else {
        this.log('⚠ Brak rekordu DMARC (zalecany)', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('DNS: Brak DMARC');
      }
    } catch (error) {
      this.log(`⚠ Brak rekordu DMARC: ${error.message}`, 'warning');
      this.results.warningCount++;
      this.results.warnings.push('DNS: Brak DMARC');
    }

    try {
      const mxRecords = await resolveMx(domain);

      if (mxRecords && mxRecords.length > 0) {
        this.log(`✓ Rekordy MX znalezione (${mxRecords.length})`, 'success');
        mxRecords.forEach(mx => {
          this.log(`  - ${mx.exchange} (priority: ${mx.priority})`, 'info');
        });
        this.results.passed++;
        this.results.success.push('DNS: MX OK');
      } else {
        this.log('⚠ Brak rekordów MX', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('DNS: Brak MX');
      }
    } catch (error) {
      this.log(`⚠ Błąd sprawdzania MX: ${error.message}`, 'warning');
      this.results.warningCount++;
      this.results.warnings.push('DNS: Błąd MX');
    }

    return true;
  }

  async testCORS() {
    this.log('\n=== TEST CORS ===', 'info');

    try {
      const { supabaseUrl } = this.config;

      if (!supabaseUrl) {
        this.log('? Brak konfiguracji Supabase URL - pomijam test CORS', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('CORS: Pominięto (brak konfiguracji Supabase URL)');
        return true;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET'
        }
      });

      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };

      if (corsHeaders['access-control-allow-origin']) {
        this.log('✓ CORS jest skonfigurowany', 'success');
        this.log(`  Origin: ${corsHeaders['access-control-allow-origin']}`, 'info');
        this.results.passed++;
        this.results.success.push('CORS: Skonfigurowany');
      } else {
        this.log('⚠ CORS może nie być skonfigurowany', 'warning');
        this.results.warningCount++;
        this.results.warnings.push('CORS: Możliwe problemy');
      }

      return true;
    } catch (error) {
      this.log(`✗ Błąd sprawdzania CORS: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`CORS: ${error.message}`);
      return false;
    }
  }

  async testEnvironmentVariables() {
    this.log('\n=== SPRAWDZANIE ZMIENNYCH ŚRODOWISKOWYCH ===', 'info');

    const requiredVars = [
      { name: 'VITE_SUPABASE_URL', value: this.config.supabaseUrl },
      { name: 'VITE_SUPABASE_ANON_KEY', value: this.config.supabaseAnonKey },
      { name: 'RESEND_API_KEY', value: this.config.resendApiKey }
    ];

    const optionalVars = [
      { name: 'MAIL_FROM', value: this.config.mailFrom },
      { name: 'EMAIL_DOMAIN', value: this.config.emailDomain }
    ];

    let allRequiredPresent = true;

    requiredVars.forEach(({ name, value }) => {
      if (value) {
        this.log(`✓ ${name} jest ustawiona`, 'success');
        this.results.passed++;
      } else {
        this.log(`✗ ${name} BRAK`, 'error');
        this.results.failed++;
        this.results.errors.push(`Env: Brak ${name}`);
        allRequiredPresent = false;
      }
    });

    optionalVars.forEach(({ name, value }) => {
      if (value) {
        this.log(`✓ ${name} jest ustawiona`, 'success');
      } else {
        this.log(`⚠ ${name} nie jest ustawiona (opcjonalna)`, 'warning');
        this.results.warningCount++;
        this.results.warnings.push(`Env: Brak ${name}`);
      }
    });

    return allRequiredPresent;
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('RAPORT KOŃCOWY', 'info');
    this.log('='.repeat(60), 'info');

    this.log(`\nTesty zakończone: ${this.results.passed}`, 'success');
    this.log(`Testy nieudane: ${this.results.failed}`, 'error');
    this.log(`Ostrzeżenia: ${this.results.warningCount}`, 'warning');

    if (this.results.errors.length > 0) {
      this.log('\n--- BŁĘDY ---', 'error');
      this.results.errors.forEach(err => this.log(`  ✗ ${err}`, 'error'));
    }

    if (this.results.warnings.length > 0) {
      this.log('\n--- OSTRZEŻENIA ---', 'warning');
      this.results.warnings.forEach(warn => this.log(`  ⚠ ${warn}`, 'warning'));
    }

    if (this.results.success.length > 0) {
      this.log('\n--- SUKCES ---', 'success');
      this.results.success.forEach(succ => this.log(`  ✓ ${succ}`, 'success'));
    }

    this.log('\n' + '='.repeat(60), 'info');

    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(2) : 0;

    this.log(`Wskaźnik sukcesu: ${successRate}%`, successRate >= 80 ? 'success' : 'error');
    this.log('='.repeat(60) + '\n', 'info');

    return {
      success: this.results.failed === 0,
      passed: this.results.passed,
      failed: this.results.failed,
      warnings: this.results.warningCount,
      successRate
    };
  }

  async runAllTests() {
    this.log('Rozpoczynam testy integracyjne...', 'info');
    this.log(`Środowisko: ${this.config.environment}\n`, 'info');

    const envOk = await this.testEnvironmentVariables();
    if (!envOk) {
      this.log('\n⚠ Brak wymaganych zmiennych środowiskowych - przerywam dalsze testy zależne od konfiguracji', 'warning');
      return this.generateReport();
    }

    await this.testSupabaseConnection();
    await this.testSupabaseAuth();
    await this.testSupabaseDatabase();
    await this.testSupabaseRLS();
    await this.testResendAPI();
    await this.testSupabaseEdgeFunction();
    await this.testDNSRecords();
    await this.testCORS();

    return this.generateReport();
  }
}

function loadConfig() {
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    environment: isDev ? 'development' : 'production',
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    mailFrom: process.env.MAIL_FROM,
    emailDomain: process.env.EMAIL_DOMAIN,
    testEmail: process.env.TEST_EMAIL || 'test@example.com'
  };
}

async function main() {
  try {
    const config = loadConfig();
    const tester = new IntegrationTester(config);
    const report = await tester.runAllTests();

    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}Krytyczny błąd: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
