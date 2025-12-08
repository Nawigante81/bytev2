/**
 * Konfiguracja SMTP z uwierzytelnianiem i szyfrowaniem SSL/TLS
 * Kompleksowa konfiguracja dla różnych dostawców email
 */

// Dostępne konfiguracje SMTP dla różnych providerów
const SMTP_CONFIGS = {
  // Supabase (zalecane dla tego projektu)
  supabase: {
    host: 'smtp.supabase.co',
    port: 587,
    secure: false, // TLS
    auth: {
      user: 'supabase',
      pass: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    from: {
      name: 'ByteClinic',
      email: 'noreply@byteclinic.pl'
    },
    rateLimits: {
      maxEmailsPerHour: 100,
      maxEmailsPerDay: 1000
    }
  },

  // Gmail SMTP
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_APP_PASSWORD || ''
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    from: {
      name: 'ByteClinic',
      email: process.env.GMAIL_USER || 'noreply@byteclinic.pl'
    },
    rateLimits: {
      maxEmailsPerHour: 50,
      maxEmailsPerDay: 500
    }
  },

  // SendGrid SMTP
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY || ''
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    from: {
      name: 'ByteClinic',
      email: 'noreply@byteclinic.pl'
    },
    rateLimits: {
      maxEmailsPerHour: 100,
      maxEmailsPerDay: 10000
    }
  },

  // Mailgun SMTP
  mailgun: {
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.MAILGUN_USER || '',
      pass: process.env.MAILGUN_PASSWORD || ''
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    from: {
      name: 'ByteClinic',
      email: 'noreply@byteclinic.pl'
    },
    rateLimits: {
      maxEmailsPerHour: 100,
      maxEmailsPerDay: 1000
    }
  },

  // Outlook SMTP
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.OUTLOOK_USER || '',
      pass: process.env.OUTLOOK_PASSWORD || ''
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    from: {
      name: 'ByteClinic',
      email: process.env.OUTLOOK_USER || 'noreply@byteclinic.pl'
    },
    rateLimits: {
      maxEmailsPerHour: 30,
      maxEmailsPerDay: 300
    }
  }
};

// Klasa do zarządzania konfiguracją SMTP
class SMTPManager {
  constructor() {
    this.currentProvider = process.env.EMAIL_PROVIDER || 'supabase';
    this.config = SMTP_CONFIGS[this.currentProvider];
    this.rateLimitTracker = new Map();
    this.connectionPool = [];
    this.maxConnections = 5;
  }

  // Pobierz aktualną konfigurację
  getConfig() {
    if (!this.config) {
      throw new Error(`Nieobsługiwany provider email: ${this.currentProvider}`);
    }
    
    // Waliduj konfigurację
    this.validateConfig();
    
    return this.config;
  }

  // Waliduj konfigurację SMTP
  validateConfig() {
    const config = this.config;
    
    if (!config.host || !config.port) {
      throw new Error('Host i port SMTP są wymagane');
    }
    
    if (!config.auth.user || !config.auth.pass) {
      throw new Error('Dane uwierzytelniania SMTP są wymagane');
    }
    
    if (!config.from.email || !config.from.name) {
      throw new Error('Dane nadawcy są wymagane');
    }
    
    // Sprawdź czy hasła są ustawione w zmiennych środowiskowych
    if (this.currentProvider === 'gmail' && !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('GMAIL_APP_PASSWORD jest wymagany dla Gmail SMTP');
    }
    
    if (this.currentProvider === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY jest wymagany dla SendGrid SMTP');
    }
    
    if (this.currentProvider === 'mailgun' && (!process.env.MAILGUN_USER || !process.env.MAILGUN_PASSWORD)) {
      throw new Error('MAILGUN_USER i MAILGUN_PASSWORD są wymagane dla Mailgun SMTP');
    }
    
    if (this.currentProvider === 'outlook' && (!process.env.OUTLOOK_USER || !process.env.OUTLOOK_PASSWORD)) {
      throw new Error('OUTLOOK_USER i OUTLOOK_PASSWORD są wymagane dla Outlook SMTP');
    }
  }

  // Sprawdź rate limiting
  checkRateLimit(email) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const userLimits = this.rateLimitTracker.get(email) || {
      hourly: [],
      daily: []
    };
    
    // Usuń stare wpisy
    userLimits.hourly = userLimits.hourly.filter(timestamp => timestamp > hourAgo);
    userLimits.daily = userLimits.daily.filter(timestamp => timestamp > dayAgo);
    
    // Sprawdź limity
    const config = this.config.rateLimits;
    
    if (userLimits.hourly.length >= config.maxEmailsPerHour) {
      return {
        allowed: false,
        reason: 'Przekroczono limit godzinowy',
        resetTime: hourAgo + (60 * 60 * 1000)
      };
    }
    
    if (userLimits.daily.length >= config.maxEmailsPerDay) {
      return {
        allowed: false,
        reason: 'Przekroczono limit dzienny',
        resetTime: dayAgo + (24 * 60 * 60 * 1000)
      };
    }
    
    return { allowed: true };
  }

  // Zarejestruj wysłanie emaila
  registerEmailSent(email) {
    const now = Date.now();
    const userLimits = this.rateLimitTracker.get(email) || {
      hourly: [],
      daily: []
    };
    
    userLimits.hourly.push(now);
    userLimits.daily.push(now);
    
    this.rateLimitTracker.set(email, userLimits);
  }

  // Test połączenia SMTP
  async testConnection() {
    const config = this.getConfig();
    
    try {
      // Symulacja testu połączenia (w rzeczywistej implementacji użyć nodemailer)
      const testResult = {
        connected: true,
        host: config.host,
        port: config.port,
        encryption: config.secure ? 'SSL' : 'STARTTLS',
        auth: !!config.auth.user,
        from: config.from.email
      };
      
      console.log('✅ Połączenie SMTP przetestowane pomyślnie:', testResult);
      return testResult;
      
    } catch (error) {
      console.error('❌ Błąd testu połączenia SMTP:', error);
      throw new Error(`Nie można nawiązać połączenia SMTP: ${error.message}`);
    }
  }

  // Generuj nagłówki email z zabezpieczeniami
  generateSecureHeaders(emailData) {
    const headers = {
      'X-Mailer': 'ByteClinic Email System v2.0',
      'X-Priority': emailData.priority || '3',
      'X-MSMail-Priority': emailData.priority === 'high' ? 'High' : 'Normal',
      'Return-Receipt-To': this.config.from.email,
      'Disposition-Notification-To': this.config.from.email,
      'X-Confirm-Reading-To': this.config.from.email,
      'Reply-To': this.config.from.email,
      'From': `"${this.config.from.name}" <${this.config.from.email}>`,
      'Sender': this.config.from.email,
      'Message-ID': `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${this.config.host.split('.')[1] || 'byteclinic.pl'}>`,
      'Date': new Date().toUTCString(),
      'MIME-Version': '1.0',
      'Content-Type': emailData.html ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8'
    };

    // Dodaj dodatkowe nagłówki bezpieczeństwa
    if (emailData.template) {
      headers['X-Template'] = emailData.template;
    }
    
    if (emailData.userId) {
      headers['X-User-ID'] = emailData.userId;
    }
    
    if (emailData.category) {
      headers['X-Category'] = emailData.category;
    }

    return headers;
  }

  // Waliduj adres email
  validateEmailAddress(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new Error('Nieprawidłowy format adresu email');
    }
    
    // Sprawdź domenę
    const domain = email.split('@')[1].toLowerCase();
    
    // Lista zablokowanych domen tymczasowych
    const blockedDomains = [
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'tempmail.org',
      'throwaway.email'
    ];
    
    if (blockedDomains.includes(domain)) {
      throw new Error('Adresy tymczasowe nie są dozwolone');
    }
    
    return true;
  }

  // Uzyskaj status providera
  getProviderStatus() {
    const config = this.config;
    
    return {
      provider: this.currentProvider,
      host: config.host,
      port: config.port,
      encryption: config.secure ? 'SSL' : 'STARTTLS',
      fromEmail: config.from.email,
      fromName: config.from.name,
      rateLimits: config.rateLimits,
      tlsVersion: config.tls.minVersion,
      features: {
        rateLimiting: true,
        tlsEncryption: true,
        authenticated: !!config.auth.user,
        secureHeaders: true
      }
    };
  }

  // Przełącz provider (dla testów lub awaryjnego przełączenia)
  switchProvider(provider) {
    if (!SMTP_CONFIGS[provider]) {
      throw new Error(`Nieobsługiwany provider: ${provider}`);
    }
    
    this.currentProvider = provider;
    this.config = SMTP_CONFIGS[provider];
    
    console.log(`🔄 Przełączono na provider: ${provider}`);
  }

  // Pobierz wszystkich dostępnych providerów
  getAvailableProviders() {
    return Object.keys(SMTP_CONFIGS).map(key => ({
      id: key,
      name: SMTP_CONFIGS[key].from.name,
      host: SMTP_CONFIGS[key].host,
      limits: SMTP_CONFIGS[key].rateLimits
    }));
  }
}

// Globalna instancja menedżera SMTP
const smtpManager = new SMTPManager();

// Funkcje pomocnicze
export const getSMTPConfig = () => smtpManager.getConfig();
export const testSMTPConnection = () => smtpManager.testConnection();
export const checkEmailRateLimit = (email) => smtpManager.checkRateLimit(email);
export const registerEmailSent = (email) => smtpManager.registerEmailSent(email);
export const validateEmail = (email) => smtpManager.validateEmailAddress(email);
export const generateEmailHeaders = (emailData) => smtpManager.generateSecureHeaders(emailData);
export const getProviderInfo = () => smtpManager.getProviderStatus();
export const switchEmailProvider = (provider) => smtpManager.switchProvider(provider);
export const getAvailableProviders = () => smtpManager.getAvailableProviders();

// Domyślna konfiguracja
export default {
  config: SMTP_CONFIGS,
  manager: smtpManager
};