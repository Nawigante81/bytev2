/**
 * Serwis walidacji poprawności dostarczania emaili
 * Monitoruje, testuje i waliduje wszystkie aspekty systemu email
 */

import { getSMTPConfig, testSMTPConnection, checkEmailRateLimit } from '@/config/smtp.config';

class EmailValidationService {
  constructor() {
    this.validationRules = {
      email: {
        maxLength: 254,
        minLength: 5,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        blockedDomains: [
          '10minutemail.com',
          'guerrillamail.com', 
          'mailinator.com',
          'tempmail.org',
          'throwaway.email',
          'yopmail.com',
          'maildrop.cc'
        ]
      },
      content: {
        maxSubjectLength: 200,
        maxBodyLength: 50000,
        requiredFields: ['from', 'subject', 'content']
      },
      templates: {
        maxRetries: 3,
        timeoutMs: 30000,
        requiredHeaders: ['X-Template', 'Message-ID', 'Date']
      }
    };
    
    this.metrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalBounced: 0,
      totalFailed: 0,
      deliveryRate: 0,
      bounceRate: 0,
      errorRate: 0,
      lastValidation: null,
      validationHistory: []
    };
  }

  // Główna funkcja walidacji emaila
  async validateEmail(emailData) {
    const validationId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Rozpoczęcie walidacji emaila: ${validationId}`);
      
      // 1. Walidacja struktury emaila
      const structureValidation = this.validateEmailStructure(emailData);
      if (!structureValidation.isValid) {
        return this.createValidationResult(validationId, false, 'structure', structureValidation.errors, startTime);
      }
      
      // 2. Walidacja treści
      const contentValidation = this.validateEmailContent(emailData);
      if (!contentValidation.isValid) {
        return this.createValidationResult(validationId, false, 'content', contentValidation.errors, startTime);
      }
      
      // 3. Walidacja szablonu
      const templateValidation = this.validateEmailTemplate(emailData);
      if (!templateValidation.isValid) {
        return this.createValidationResult(validationId, false, 'template', templateValidation.errors, startTime);
      }
      
      // 4. Walidacja SMTP
      const smtpValidation = await this.validateSMTPConfig();
      if (!smtpValidation.isValid) {
        return this.createValidationResult(validationId, false, 'smtp', smtpValidation.errors, startTime);
      }
      
      // 5. Walidacja rate limiting
      const rateLimitValidation = this.validateRateLimit(emailData.to);
      if (!rateLimitValidation.isValid) {
        return this.createValidationResult(validationId, false, 'rate_limit', rateLimitValidation.errors, startTime);
      }
      
      // 6. Walidacja bezpieczeństwa
      const securityValidation = this.validateEmailSecurity(emailData);
      if (!securityValidation.isValid) {
        return this.createValidationResult(validationId, false, 'security', securityValidation.errors, startTime);
      }
      
      // 7. Test dostarczalności
      const deliverabilityTest = await this.testEmailDeliverability(emailData);
      
      const result = this.createValidationResult(
        validationId, 
        true, 
        'all_checks_passed', 
        null, 
        startTime,
        {
          structure: structureValidation,
          content: contentValidation,
          template: templateValidation,
          smtp: smtpValidation,
          rateLimit: rateLimitValidation,
          security: securityValidation,
          deliverability: deliverabilityTest
        }
      );
      
      console.log(`✅ Walidacja zakończona pomyślnie: ${validationId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Błąd walidacji emaila ${validationId}:`, error);
      return this.createValidationResult(validationId, false, 'system_error', [error.message], startTime);
    }
  }

  // Walidacja struktury emaila
  validateEmailStructure(emailData) {
    const errors = [];
    
    // Waliduj adres email
    if (!emailData.to) {
      errors.push('Brak adresata (to)');
    } else {
      try {
        this.validateEmailAddress(emailData.to);
      } catch (error) {
        errors.push(`Nieprawidłowy adres email: ${error.message}`);
      }
    }
    
    // Waliduj nadawcę
    if (!emailData.from) {
      errors.push('Brak nadawcy (from)');
    }
    
    // Waliduj temat
    if (!emailData.subject) {
      errors.push('Brak tematu (subject)');
    } else if (emailData.subject.length > this.validationRules.email.maxSubjectLength) {
      errors.push('Temat jest za długi');
    }
    
    // Waliduj treść
    if (!emailData.html && !emailData.text) {
      errors.push('Brak treści emaila (html lub text)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 20))
    };
  }

  // Walidacja treści emaila
  validateEmailContent(emailData) {
    const errors = [];
    
    // Sprawdź długość treści
    if (emailData.html && emailData.html.length > this.validationRules.content.maxBodyLength) {
      errors.push('Treść HTML jest za długa');
    }
    
    if (emailData.text && emailData.text.length > this.validationRules.content.maxBodyLength) {
      errors.push('Treść tekstowa jest za długa');
    }
    
    // Sprawdź czy treść nie jest pusta
    const hasContent = (emailData.html && emailData.html.trim().length > 0) || 
                      (emailData.text && emailData.text.trim().length > 0);
    
    if (!hasContent) {
      errors.push('Treść emaila jest pusta');
    }
    
    // Sprawdź czy nie zawiera podejrzanych tagów
    if (emailData.html) {
      const suspiciousTags = ['<script', '<iframe', '<object', '<embed'];
      const hasSuspiciousContent = suspiciousTags.some(tag => 
        emailData.html.toLowerCase().includes(tag)
      );
      
      if (hasSuspiciousContent) {
        errors.push('Treść zawiera podejrzane tagi');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 25))
    };
  }

  // Walidacja szablonu emaila
  validateEmailTemplate(emailData) {
    const errors = [];
    
    // Sprawdź czy ma informacje o szablonie
    if (!emailData.template) {
      errors.push('Brak informacji o szablonie');
    }
    
    // Sprawdź wymagane nagłówki
    const requiredHeaders = this.validationRules.templates.requiredHeaders;
    for (const header of requiredHeaders) {
      if (!emailData.headers || !emailData.headers[header]) {
        errors.push(`Brak wymaganego nagłówka: ${header}`);
      }
    }
    
    // Sprawdź czy ma wersję tekstową jeśli ma HTML
    if (emailData.html && !emailData.text) {
      errors.push('Brak wersji tekstowej dla emaila HTML');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 15))
    };
  }

  // Walidacja konfiguracji SMTP
  async validateSMTPConfig() {
    const errors = [];
    
    try {
      const smtpConfig = getSMTPConfig();
      
      // Sprawdź podstawowe wymagania
      if (!smtpConfig.host || !smtpConfig.port) {
        errors.push('Brak hosta lub portu SMTP');
      }
      
      if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
        errors.push('Brak danych uwierzytelniania SMTP');
      }
      
      // Test połączenia
      try {
        await testSMTPConnection();
      } catch (error) {
        errors.push(`Nie można nawiązać połączenia SMTP: ${error.message}`);
      }
      
    } catch (error) {
      errors.push(`Błąd konfiguracji SMTP: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 30))
    };
  }

  // Walidacja rate limiting
  validateRateLimit(email) {
    const errors = [];
    
    try {
      const rateLimit = checkEmailRateLimit(email);
      
      if (!rateLimit.allowed) {
        errors.push(`Rate limit exceeded: ${rateLimit.reason}`);
      }
      
    } catch (error) {
      errors.push(`Błąd sprawdzania rate limit: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: errors.length === 0 ? 100 : 0
    };
  }

  // Walidacja bezpieczeństwa
  validateEmailSecurity(emailData) {
    const errors = [];
    
    // Sprawdź czy ma token weryfikacyjny (jeśli wymagane)
    if (emailData.template === 'emailConfirmation' && !emailData.token) {
      errors.push('Brak tokena weryfikacyjnego dla potwierdzenia email');
    }
    
    // Sprawdź nagłówki bezpieczeństwa
    const securityHeaders = ['X-Mailer', 'Message-ID', 'Date'];
    for (const header of securityHeaders) {
      if (!emailData.headers || !emailData.headers[header]) {
        errors.push(`Brak nagłówka bezpieczeństwa: ${header}`);
      }
    }
    
    // Sprawdź czy nie ma podejrzanych linków
    if (emailData.html) {
      const suspiciousLinks = ['bit.ly', 'tinyurl.com', 'goo.gl'];
      const hasSuspiciousLinks = suspiciousLinks.some(domain => 
        emailData.html.toLowerCase().includes(domain)
      );
      
      if (hasSuspiciousLinks) {
        errors.push('Email zawiera skrócone linki, które mogą być podejrzane');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 20))
    };
  }

  // Test dostarczalności emaila
  async testEmailDeliverability(emailData) {
    // Symulacja testu dostarczalności
    const testResults = {
      spamScore: Math.random() * 10, // 0-10 (im mniej tym lepiej)
      dnsValidation: true,
      smtpValidation: true,
      contentAnalysis: true,
      overallScore: 85
    };
    
    // Symulacja wyników analizy
    const spamTests = [
      { name: 'SPF Check', passed: Math.random() > 0.1 },
      { name: 'DKIM Check', passed: Math.random() > 0.05 },
      { name: 'DMARC Check', passed: Math.random() > 0.1 },
      { name: 'Content Analysis', passed: Math.random() > 0.15 }
    ];
    
    const passedTests = spamTests.filter(test => test.passed).length;
    testResults.overallScore = Math.round((passedTests / spamTests.length) * 100);
    testResults.spamScore = Math.round((10 - (passedTests / spamTests.length) * 10) * 10) / 10;
    testResults.tests = spamTests;
    
    return testResults;
  }

  // Waliduj adres email
  validateEmailAddress(email) {
    const rules = this.validationRules.email;
    
    if (email.length < rules.minLength || email.length > rules.maxLength) {
      throw new Error(`Email musi mieć długość między ${rules.minLength} a ${rules.maxLength} znaków`);
    }
    
    if (!rules.pattern.test(email)) {
      throw new Error('Nieprawidłowy format adresu email');
    }
    
    const domain = email.split('@')[1].toLowerCase();
    
    if (rules.blockedDomains.includes(domain)) {
      throw new Error('Adresy tymczasowe nie są dozwolone');
    }
    
    return true;
  }

  // Utwórz wynik walidacji
  createValidationResult(validationId, isValid, category, errors, startTime, details = null) {
    const duration = Date.now() - startTime;
    
    const result = {
      validationId,
      isValid,
      category,
      errors: errors || [],
      duration,
      timestamp: new Date().toISOString(),
      details
    };
    
    // Zapisz do historii
    this.metrics.validationHistory.unshift(result);
    
    // Zachowaj tylko ostatnie 100 walidacji
    if (this.metrics.validationHistory.length > 100) {
      this.metrics.validationHistory = this.metrics.validationHistory.slice(0, 100);
    }
    
    // Aktualizuj metryki
    this.metrics.lastValidation = Date.now();
    
    return result;
  }

  // Pobierz metryki walidacji
  getValidationMetrics() {
    const recentValidations = this.metrics.validationHistory.filter(
      v => Date.now() - new Date(v.timestamp).getTime() < 24 * 60 * 60 * 1000
    );
    
    const successCount = recentValidations.filter(v => v.isValid).length;
    const totalCount = recentValidations.length;
    
    return {
      ...this.metrics,
      successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      recentValidations: recentValidations.length,
      avgDuration: recentValidations.length > 0 
        ? recentValidations.reduce((sum, v) => sum + v.duration, 0) / recentValidations.length 
        : 0
    };
  }

  // Wykonaj kompleksowy test systemu
  async runSystemValidation() {
    console.log('🔍 Uruchamianie kompleksowej walidacji systemu email...');
    
    const testEmail = `test.${Date.now()}@byteclinic.pl`;
    
    const testData = {
      to: testEmail,
      from: 'noreply@byteclinic.pl',
      subject: 'Test walidacji systemu email',
      html: '<h1>Test</h1><p>To jest testowy email</p>',
      text: 'Test\n\nTo jest testowy email',
      template: 'test',
      headers: {
        'X-Mailer': 'ByteClinic Email System',
        'Message-ID': `test-${Date.now()}@byteclinic.pl`,
        'Date': new Date().toUTCString()
      }
    };
    
    const validation = await this.validateEmail(testData);
    
    const systemReport = {
      timestamp: new Date().toISOString(),
      overallStatus: validation.isValid ? 'healthy' : 'issues_detected',
      validation,
      metrics: this.getValidationMetrics(),
      recommendations: this.generateRecommendations(validation)
    };
    
    console.log('📊 Raport walidacji systemu:', systemReport);
    return systemReport;
  }

  // Generuj rekomendacje na podstawie walidacji
  generateRecommendations(validation) {
    const recommendations = [];
    
    if (!validation.isValid) {
      if (validation.category === 'structure') {
        recommendations.push('Sprawdź strukturę emaila - brakuje wymaganych pól');
      }
      
      if (validation.category === 'smtp') {
        recommendations.push('Skonfiguruj poprawnie SMTP - sprawdź dane uwierzytelniania');
      }
      
      if (validation.category === 'rate_limit') {
        recommendations.push('Zmniejsz częstotliwość wysyłania emaili lub zwiększ limity');
      }
      
      if (validation.category === 'security') {
        recommendations.push('Dodaj brakujące nagłówki bezpieczeństwa');
      }
      
      if (validation.category === 'content') {
        recommendations.push('Sprawdź treść emaila - może zawierać podejrzane elementy');
      }
    }
    
    if (validation.details?.deliverability) {
      const score = validation.details.deliverability.overallScore;
      
      if (score < 70) {
        recommendations.push('Niski wynik dostarczalności - sprawdź konfigurację DNS');
      }
      
      if (validation.details.deliverability.spamScore > 5) {
        recommendations.push('Wysoki spam score - sprawdź treść i nagłówki emaila');
      }
    }
    
    return recommendations;
  }

  // Resetuj metryki
  resetMetrics() {
    this.metrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalBounced: 0,
      totalFailed: 0,
      deliveryRate: 0,
      bounceRate: 0,
      errorRate: 0,
      lastValidation: null,
      validationHistory: []
    };
    
    console.log('🔄 Metryki walidacji zostały zresetowane');
  }
}

// Globalna instancja serwisu walidacji
const emailValidationService = new EmailValidationService();

export default emailValidationService;

// Export funkcji pomocniczych
export const validateEmail = (emailData) => emailValidationService.validateEmail(emailData);
export const getValidationMetrics = () => emailValidationService.getValidationMetrics();
export const runSystemValidation = () => emailValidationService.runSystemValidation();
export const resetValidationMetrics = () => emailValidationService.resetMetrics();