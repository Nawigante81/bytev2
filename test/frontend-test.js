import { createClient } from '@supabase/su

pabase-js';

class FrontendTester {
  constructor() {
    this.results = [];
  }

  async testSupabaseClient() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Brak konfiguracji Supabase');
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.auth.getSession();

      if (error && error.message !== 'Auth session missing!') {
        throw error;
      }

      this.results.push({ test: 'Supabase Client', status: 'PASS' });
      return true;
    } catch (error) {
      this.results.push({ test: 'Supabase Client', status: 'FAIL', error: error.message });
      return false;
    }
  }

  async testAPIEndpoints() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/rest/v1/`);
      
      if (response.status ===

 200 || response.status === 401) {
        this.results.push({ test: 'API Endpoints', status: 'PASS' });
        return true;
      }
      
      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      this.results.push({ test: 'API Endpoints', status: 'FAIL', error: error.message });
      return false;
    }
  }

  async testEmailFunction() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-email-resend`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: 'test@example.com',
            subject: 'Frontend Test',
            html: '<p>Test</p>'
          })
        }
      );

      if (response.status === 404) {
        this.results.

push({ test: 'Email Function', status: 'WARN', error: 'Function not deployed' });
        return true;
      }

      if (response.ok) {
        this.results.push({ test: 'Email Function', status: 'PASS' });
        return true;
      }

      throw new Error(`Status: ${response.status}`);
    } catch (error) {
      this.results.push({ test: 'Email Function', status: 'FAIL', error: error.message });
      return false;
    }
  }

  generateReport() {
    console.log('\n=== FRONTEND TEST REPORT ===\n');
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✓' : result.status === 'WARN' ? '⚠' : '✗';
      const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'WARN' ? '\x1b[33m' : '\x1b[31m';
      
      console.log(`${color}${icon} ${result.test}: ${result.status}\x1b[0m`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });

    console.log('\n============================\n');
  }

  async runTests() {
    await

 this.testSupabaseClient();
    await this.testAPIEndpoints();
    await this.testEmailFunction();
    this.generateReport();
  }
}

const tester = new FrontendTester();
tester.runTests();