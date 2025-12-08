// Rozszerzony serwis do obsługi emaili z kompleksowym systemem
// Używa Supabase Edge Functions z bezpiecznymi tokenami, kolejką i retry logic

// Config z obsługą różnych providerów
const EMAIL_CONFIG = {
  provider: 'supabase',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  },
  // Retry configuration
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000, // 1 sekunda
    exponentialBackoff: true
  },
  // Security configuration
  security: {
    tokenExpiration: 24 * 60 * 60 * 1000, // 24h
    maxTokensPerHour: 5
  }
};

// Queue system dla emaili
class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryAttempts = new Map();
  }

  add(emailJob) {
    this.queue.push({
      ...emailJob,
      id: crypto.randomUUID(),
      addedAt: Date.now(),
      attempts: 0,
      status: 'pending'
    });
    this.process();
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      await this.processJob(job);
    }
    
    this.processing = false;
  }

  async processJob(job) {
    try {
      const result = await this.executeJob(job);
      
      if (result.success) {
        job.status = 'sent';
        job.sentAt = Date.now();
        console.log(`✅ Email sent successfully: ${job.template} -> ${job.to}`);
      } else {
        await this.handleJobFailure(job, result.error);
      }
    } catch (error) {
      await this.handleJobFailure(job, error.message);
    }
  }

  async executeJob(job) {
    // Implementacja wysyłania emaila z retry logic
    const maxRetries = EMAIL_CONFIG.retryConfig.maxRetries;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        job.attempts = attempt + 1;
        
        if (attempt > 0) {
          // Exponential backoff
          const delay = EMAIL_CONFIG.retryConfig.exponentialBackoff 
            ? EMAIL_CONFIG.retryConfig.retryDelay * Math.pow(2, attempt - 1)
            : EMAIL_CONFIG.retryConfig.retryDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await this.sendEmailInternal(job);
        
        if (result.success) {
          return result;
        } else {
          lastError = new Error(result.error);
        }
      } catch (error) {
        lastError = error;
      }
    }
    
    return { success: false, error: lastError?.message || 'Unknown error' };
  }

  async handleJobFailure(job, error) {
    job.status = 'failed';
    job.error = error;
    job.failedAt = Date.now();
    
    const attempts = this.retryAttempts.get(job.id) || 0;
    this.retryAttempts.set(job.id, attempts + 1);
    
    console.error(`❌ Email failed after ${job.attempts} attempts: ${job.template} -> ${job.to}`, error);
    
    // Log failed email for monitoring
    await this.logFailedEmail(job, error);
  }

  async logFailedEmail(job, error) {
    // TODO: Implement logowanie do bazy danych
    console.error('Failed email details:', {
      id: job.id,
      to: job.to,
      template: job.template,
      attempts: job.attempts,
      error: error,
      addedAt: new Date(job.addedAt).toISOString()
    });
  }

  async sendEmailInternal(job) {
    // Implementacja wysyłania przez Supabase Edge Function
    const functionName = this.getFunctionNameForTemplate(job.template);
    
    const response = await fetch(`${EMAIL_CONFIG.supabase.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EMAIL_CONFIG.supabase.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
        data: job.data,
        metadata: job.metadata
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `Supabase Function error: ${response.statusText} - ${errorText}` 
      };
    }

    const result = await response.json();
    return {
      success: true,
      provider: 'supabase',
      ...result
    };
  }

  getQueueStatus() {
    return {
      pending: this.queue.length,
      processing: this.processing,
      failed: Array.from(this.retryAttempts.entries()).filter(([_, attempts]) => attempts > 0).length
    };
  }
}

// Globalna instancja kolejki
const emailQueue = new EmailQueue();

// Rozszerzone responsywne szablony emaili z wersjami tekstowymi
const EMAIL_TEMPLATES = {
  bookingConfirmation: (bookingData) => ({
    subject: `✅ Potwierdzenie rezerwacji #${bookingData.bookingId} - ByteClinic`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ByteClinic</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Serwis, który ogarnia temat</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b; margin-bottom: 20px;">🎉 Potwierdzenie rezerwacji</h2>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #334155;">Szczegóły wizyty:</h3>
            <p style="margin: 5px 0;"><strong>Numer rezerwacji:</strong> #${bookingData.bookingId}</p>
            <p style="margin: 5px 0;"><strong>Data:</strong> ${bookingData.date}</p>
            <p style="margin: 5px 0;"><strong>Godzina:</strong> ${bookingData.time}</p>
            <p style="margin: 5px 0;"><strong>Usługa:</strong> ${bookingData.service}</p>
            <p style="margin: 5px 0;"><strong>Czas trwania:</strong> ${bookingData.duration} minut</p>
            <p style="margin: 5px 0;"><strong>Cena:</strong> ${bookingData.price === 0 ? 'Darmowe' : `${bookingData.price} PLN`}</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">📍 Informacje o wizycie</h4>
            <p style="margin: 5px 0; color: #78350f;"><strong>Miejsce:</strong> Serwis ByteClinic, Zgorzelec</p>
            <p style="margin: 5px 0; color: #78350f;"><strong>Adres zostanie podany w przypomnieniu</strong></p>
            <p style="margin: 5px 0; color: #78350f;"><strong>Prosimy o punktualne przybycie</strong></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://byteclinic.pl/sledzenie?ref=${bookingData.bookingId}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              🔍 Śledź postęp naprawy
            </a>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #334155;">📞 Potrzebujesz pomocy?</h4>
            <p style="margin: 5px 0;">Telefon: <a href="tel:+48724316523" style="color: #3b82f6;">+48 724 316 523</a></p>
            <p style="margin: 5px 0;">Email: <a href="mailto:kontakt@byteclinic.pl" style="color: #3b82f6;">kontakt@byteclinic.pl</a></p>
            <p style="margin: 5px 0; color: #64748b;">Godziny pracy: Pon-Pt 9:00-17:00</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b;">
            <p style="margin: 0;">Dziękujemy za zaufanie!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🚀</p>
          </div>
        </div>
      </div>
    `
  }),

  repairRequest: (repairData) => ({
    subject: `🔔 Nowe zgłoszenie naprawcze - ByteClinic`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ByteClinic</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Nowe zgłoszenie naprawcze</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b; margin-bottom: 20px;">🔔 Nowe zgłoszenie naprawcze</h2>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #334155;">Szczegóły zgłoszenia:</h3>
            <p style="margin: 5px 0;"><strong>Numer zgłoszenia:</strong> ${repairData.id}</p>
            <p style="margin: 5px 0;"><strong>Data zgłoszenia:</strong> ${new Date().toLocaleDateString('pl-PL')}</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #92400e;">👤 Dane klienta</h3>
            <p style="margin: 5px 0;"><strong>Imię:</strong> ${repairData.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${repairData.email}">${repairData.email}</a></p>
            <p style="margin: 5px 0;"><strong>Telefon:</strong> <a href="tel:${repairData.phone}">${repairData.phone}</a></p>
          </div>
          
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af;">💻 Urządzenie</h3>
            <p style="margin: 5px 0;"><strong>Kategoria:</strong> ${repairData.device}</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #334155;">📝 Opis problemu</h3>
            <p style="margin: 5px 0; padding: 15px; background-color: white; border-radius: 6px; border-left: 4px solid #3b82f6;">${repairData.message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${repairData.email}?subject=Odpowiedź na zgłoszenie ${repairData.id}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
              📧 Odpowiedz klientowi
            </a>
            <a href="tel:${repairData.phone}" 
               style="display: inline-block; border: 2px solid #3b82f6; color: #3b82f6; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              📞 Zadzwoń
            </a>
          </div>
          
          <div style="text-align: center; color: #64748b; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px;">Zgłoszenie wysłane z formularza kontaktowego ByteClinic</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🚀</p>
          </div>
        </div>
      </div>
    `
  }),

  repairStatusUpdate: (repairData) => ({
    subject: `🔧 Status naprawy #${repairData.repairId} - ${repairData.status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ByteClinic</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Status Twojej naprawy</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 10px 20px; border-radius: 25px; font-weight: bold; margin-bottom: 15px;"
                 style="background-color: ${getStatusColor(repairData.status)}20; color: ${getStatusColor(repairData.status)}; border: 2px solid ${getStatusColor(repairData.status)}40;">
              ${getStatusIcon(repairData.status)} ${getStatusLabel(repairData.status)}
            </div>
            <h2 style="margin: 0; color: #1e293b;">Numer naprawy: #${repairData.repairId}</h2>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #334155;">Szczegóły naprawy:</h3>
            <p style="margin: 5px 0;"><strong>Urządzenie:</strong> ${repairData.device}</p>
            <p style="margin: 5px 0;"><strong>Problem:</strong> ${repairData.issue}</p>
            <p style="margin: 5px 0;"><strong>Postęp:</strong> ${repairData.progress}%</p>
            <p style="margin: 5px 0;"><strong>Technik:</strong> ${repairData.technician}</p>
            <p style="margin: 5px 0;"><strong>Szacowany czas zakończenia:</strong> ${repairData.estimatedCompletion}</p>
          </div>
          
          ${repairData.notes ? `
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1e40af;">💬 Komentarz technika:</h4>
            <p style="margin: 0; color: #1e3a8a;">${repairData.notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://byteclinic.pl/sledzenie?ref=${repairData.repairId}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
              📊 Zobacz szczegóły
            </a>
            <a href="tel:+48724316523" 
               style="display: inline-block; border: 2px solid #3b82f6; color: #3b82f6; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              📞 Zadzwoń
            </a>
          </div>
          
          <div style="text-align: center; color: #64748b; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px;">Dziękujemy za zaufanie!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🚀</p>
          </div>
        </div>
      </div>
    `
  }),

  repairReady: (repairData) => ({
    subject: `🎉 Naprawa #${repairData.repairId} gotowa do odbioru! - ByteClinic`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎉 Gotowe!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Twoja naprawa jest gotowa do odbioru</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10b98120; color: #059669; border: 2px solid #10b98140; display: inline-block; padding: 10px 20px; border-radius: 25px; font-weight: bold;">
              ✅ Gotowe do odbioru
            </div>
            <h2 style="margin: 15px 0 0 0; color: #1e293b;">Numer naprawy: #${repairData.repairId}</h2>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #334155;">Podsumowanie naprawy:</h3>
            <p style="margin: 5px 0;"><strong>Urządzenie:</strong> ${repairData.device}</p>
            <p style="margin: 5px 0;"><strong>Problem:</strong> ${repairData.issue}</p>
            <p style="margin: 5px 0;"><strong>Finalna cena:</strong> ${repairData.finalPrice} PLN</p>
            <p style="margin: 5px 0;"><strong>Czas realizacji:</strong> ${repairData.duration}</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">📍 Odbiór urządzenia</h4>
            <p style="margin: 5px 0; color: #78350f;"><strong>Adres:</strong> [ADRES SERWISU - DO UZUPEŁNIENIA]</p>
            <p style="margin: 5px 0; color: #78350f;"><strong>Godziny odbioru:</strong> Pon-Pt 9:00-17:00</p>
            <p style="margin: 5px 0; color: #78350f;"><strong>Przypominamy o zabraniu dowodu osobistego</strong></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:+48724316523" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
              📞 Zadzwoń po odbiór
            </a>
            <a href="https://byteclinic.pl/sledzenie?ref=${repairData.repairId}" 
               style="display: inline-block; border: 2px solid #3b82f6; color: #3b82f6; padding: 13px 26px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              📋 Zobacz fakturę
            </a>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #334155;">💳 Forma płatności</h4>
            <p style="margin: 5px 0;">Akceptujemy: gotówka, przelew, BLIK</p>
            <p style="margin: 5px 0;">Możliwość płatności kartą w serwisie</p>
          </div>
          
          <div style="text-align: center; color: #64748b; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px;">Dziękujemy za zaufanie!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🚀</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">Mamy nadzieję, że będziesz zadowolony z naszej usługi!</p>
          </div>
        </div>
      </div>
    `
  }),

  appointmentReminder: (bookingData) => ({
    subject: `⏰ Przypomnienie: Wizyta dziś o ${bookingData.time} - ByteClinic`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">⏰ Przypomnienie</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Masz dzisiaj wizytę w ByteClinic!</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0; color: #1e293b;">Szczegóły wizyty</h2>
            <p style="margin: 10px 0 0 0; color: #64748b;">Przypominamy o dzisiejszej wizycie</p>
          </div>

          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #92400e;">⏰ Jutro o:</h3>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #78350f; text-align: center;">${bookingData.time}</p>
            <p style="margin: 5px 0; color: #78350f; text-align: center;"><strong>${bookingData.date}</strong></p>
          </div>

          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Usługa:</strong> ${bookingData.service}</p>
            <p style="margin: 5px 0;"><strong>Numer rezerwacji:</strong> #${bookingData.bookingId}</p>
            <p style="margin: 5px 0;"><strong>Czas trwania:</strong> ${bookingData.duration} minut</p>
          </div>

          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #991b1b;">📍 Informacje o wizycie</h4>
            <p style="margin: 5px 0; color: #7f1d1d;"><strong>Adres:</strong> [ADRES SERWISU - DO UZUPEŁNIENIA]</p>
            <p style="margin: 5px 0; color: #7f1d1d;"><strong>Zaparkuj przed budynkiem</strong></p>
            <p style="margin: 5px 0; color: #7f1d1d;"><strong>Prosimy o punktualne przybycie</strong></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:+48724316523"
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
              📞 Zadzwoń w razie pytań
            </a>
            <a href="https://byteclinic.pl/sledzenie?ref=${bookingData.bookingId}"
               style="display: inline-block; border: 2px solid #3b82f6; color: #3b82f6; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              🔍 Śledź online
            </a>
          </div>

          <div style="text-align: center; color: #64748b; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px;">Do zobaczenia już niedługo!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🚀</p>
          </div>
        </div>
      </div>
    `
  }),

  emailConfirmation: (confirmationData) => {
    const { email, confirmationUrl, token } = confirmationData;
    const textContent = `
Witaj w ByteClinic!

Dziękujemy za rejestrację. Aby aktywować swoje konto, kliknij w poniższy link:

${confirmationUrl}

Link jest ważny przez 24 godziny.

Jeśli nie rejestrowałeś się w ByteClinic, zignoruj tę wiadomość.

Pozdrawiamy,
Zespół ByteClinic

Telefon: +48 724 316 523
Email: kontakt@byteclinic.pl
`;

    return {
      subject: `✅ Potwierdź swój adres e-mail - ByteClinic`,
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Potwierdzenie rejestracji - ByteClinic</title>
          <style>
            @media (max-width: 600px) {
              .container { padding: 10px !important; }
              .content { padding: 20px !important; }
              .button { padding: 12px 20px !important; font-size: 14px !important; }
              .text-center { text-align: center !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ByteClinic</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Potwierdzenie rejestracji</p>
            </div>

            <div class="content" style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div class="text-center" style="margin-bottom: 30px;">
                <h2 style="color: #1e293b; margin-bottom: 10px; font-size: 24px;">Witaj w ByteClinic!</h2>
                <p style="color: #64748b; margin: 0; font-size: 16px;">Potwierdź swój adres e-mail, aby aktywować konto.</p>
              </div>

              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #334155;"><strong>E-mail:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #334155;"><strong>Data rejestracji:</strong> ${new Date().toLocaleDateString('pl-PL')}</p>
              </div>

              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">🔐 Bezpieczeństwo</h4>
                <p style="margin: 5px 0; color: #78350f; font-size: 14px;">Link potwierdzający jest ważny przez 24 godziny.</p>
                <p style="margin: 5px 0; color: #78350f; font-size: 14px;">Jeśli nie rejestrowałeś się w ByteClinic, zignoruj tę wiadomość.</p>
              </div>

              <div class="text-center" style="margin: 30px 0;">
                <a href="${confirmationUrl}" class="button" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  ✅ Potwierdź adres e-mail
                </a>
              </div>

              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #334155; font-size: 16px;">📞 Potrzebujesz pomocy?</h4>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:</p>
                <p style="margin: 5px 0; word-break: break-all; color: #3b82f6; font-size: 14px; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">${confirmationUrl}</p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Telefon: <a href="tel:+48724316523" style="color: #3b82f6;">+48 724 316 523</a></p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Email: <a href="mailto:kontakt@byteclinic.pl" style="color: #3b82f6;">kontakt@byteclinic.pl</a></p>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b;">
                <p style="margin: 0; font-size: 16px;">Dziękujemy za rejestrację!</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🚀</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textContent
    };
  },

  // Nowy szablon dla resetu hasła
  passwordReset: (resetData) => {
    const { email, resetUrl, token } = resetData;
    const textContent = `
Resetowanie hasła - ByteClinic

Otrzymaliśmy prośbę o zresetowanie hasła dla Twojego konta.

Kliknij w poniższy link, aby zresetować hasło:
${resetUrl}

Link jest ważny przez 1 godzinę.

Jeśli nie prosiłeś o resetowanie hasła, zignoruj tę wiadomość.

Pozdrawiamy,
Zespół ByteClinic

Telefon: +48 724 316 523
Email: kontakt@byteclinic.pl
`;

    return {
      subject: `🔐 Resetowanie hasła - ByteClinic`,
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resetowanie hasła - ByteClinic</title>
          <style>
            @media (max-width: 600px) {
              .container { padding: 10px !important; }
              .content { padding: 20px !important; }
              .button { padding: 12px 20px !important; font-size: 14px !important; }
              .text-center { text-align: center !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #fef2f2;">
          <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🔐 Resetowanie hasła</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">ByteClinic - Bezpieczeństwo Twojego konta</p>
            </div>

            <div class="content" style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div class="text-center" style="margin-bottom: 30px;">
                <h2 style="color: #1e293b; margin-bottom: 10px; font-size: 24px;">Resetowanie hasła</h2>
                <p style="color: #64748b; margin: 0; font-size: 16px;">Otrzymaliśmy prośbę o zresetowanie hasła dla Twojego konta.</p>
              </div>

              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 16px;">⚠️ Ważne informacje o bezpieczeństwie</h4>
                <p style="margin: 5px 0; color: #7f1d1d; font-size: 14px;">Link do resetowania hasła jest ważny przez <strong>1 godzinę</strong>.</p>
                <p style="margin: 5px 0; color: #7f1d1d; font-size: 14px;">Jeśli nie prosiłeś o resetowanie hasła, zignoruj tę wiadomość.</p>
              </div>

              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #334155;"><strong>E-mail:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #334155;"><strong>Data żądania:</strong> ${new Date().toLocaleDateString('pl-PL')}</p>
              </div>

              <div class="text-center" style="margin: 30px 0;">
                <a href="${resetUrl}" class="button" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  🔐 Zresetuj hasło
                </a>
              </div>

              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #334155; font-size: 16px;">📞 Potrzebujesz pomocy?</h4>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:</p>
                <p style="margin: 5px 0; word-break: break-all; color: #3b82f6; font-size: 14px; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Telefon: <a href="tel:+48724316523" style="color: #3b82f6;">+48 724 316 523</a></p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Email: <a href="mailto:kontakt@byteclinic.pl" style="color: #3b82f6;">kontakt@byteclinic.pl</a></p>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b;">
                <p style="margin: 0; font-size: 16px;">Bezpieczeństwo Twojego konta jest dla nas priorytetem</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🔒</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textContent
    };
  },

  // Nowy szablon dla powiadomień o zmianach danych
  profileUpdate: (updateData) => {
    const { email, changedFields, oldValues, newValues, ipAddress, timestamp } = updateData;
    const changesList = changedFields.map(field => 
      `${field}: ${oldValues[field]} → ${newValues[field]}`
    ).join('\n');

    const textContent = `
Powiadomienie o zmianie danych konta - ByteClinic

Dane Twojego konta zostały zmienione:

${changesList}

Data zmiany: ${new Date(timestamp).toLocaleString('pl-PL')}
Adres IP: ${ipAddress}

Jeśli nie wprowadzałeś tych zmian, skontaktuj się z nami natychmiast.

Telefon: +48 724 316 523
Email: kontakt@byteclinic.pl
`;

    return {
      subject: `📝 Zmiana danych konta - ByteClinic`,
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zmiana danych konta - ByteClinic</title>
          <style>
            @media (max-width: 600px) {
              .container { padding: 10px !important; }
              .content { padding: 20px !important; }
              .text-center { text-align: center !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #fef3c7;">
          <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📝 Zmiana danych konta</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">ByteClinic - Powiadomienie o bezpieczeństwie</p>
            </div>

            <div class="content" style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div class="text-center" style="margin-bottom: 30px;">
                <h2 style="color: #1e293b; margin-bottom: 10px; font-size: 24px;">Zmiana danych konta</h2>
                <p style="color: #64748b; margin: 0; font-size: 16px;">Dane Twojego konta zostały zmienione.</p>
              </div>

              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">🔍 Szczegóły zmian</h4>
                ${changedFields.map(field => `
                  <p style="margin: 10px 0 5px 0; color: #78350f; font-size: 14px;">
                    <strong>${field}:</strong><br>
                    <span style="color: #dc2626;">${oldValues[field] || 'puste'}</span> → 
                    <span style="color: #059669;">${newValues[field] || 'puste'}</span>
                  </p>
                `).join('')}
              </div>

              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 15px 0; color: #334155; font-size: 16px;">ℹ️ Informacje techniczne</h4>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Data zmiany:</strong> ${new Date(timestamp).toLocaleString('pl-PL')}</p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Adres IP:</strong> ${ipAddress}</p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>E-mail:</strong> ${email}</p>
              </div>

              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 16px;">⚠️ Ważne</h4>
                <p style="margin: 5px 0; color: #7f1d1d; font-size: 14px;">Jeśli nie wprowadzałeś tych zmian, skontaktuj się z nami natychmiast!</p>
              </div>

              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #334155; font-size: 16px;">📞 Kontakt</h4>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Telefon: <a href="tel:+48724316523" style="color: #3b82f6;">+48 724 316 523</a></p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Email: <a href="mailto:kontakt@byteclinic.pl" style="color: #3b82f6;">kontakt@byteclinic.pl</a></p>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b;">
                <p style="margin: 0; font-size: 16px;">Dbamy o bezpieczeństwo Twojego konta</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🛡️</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textContent
    };
  },

  // Nowy szablon dla powiadomień o aktywności logowania
  loginAlert: (loginData) => {
    const { email, ipAddress, userAgent, location, timestamp, success } = loginData;
    
    const textContent = `
${success ? 'Udane' : 'Nieudane'} logowanie - ByteClinic

${success ? 'Pomyślnie zalogowano' : 'Próba logowania nie powiodła się'} do Twojego konta.

Data: ${new Date(timestamp).toLocaleString('pl-PL')}
Adres IP: ${ipAddress}
Lokalizacja: ${location || 'Nieznana'}
Przeglądarka: ${userAgent}

${success ? 'Jeśli to nie Ty się logowałeś' : 'Jeśli próbowałeś się zalogować'}, skontaktuj się z nami.

Telefon: +48 724 316 523
Email: kontakt@byteclinic.pl
`;

    const statusColor = success ? '#10b981' : '#dc2626';
    const statusBg = success ? '#ecfdf5' : '#fef2f2';
    const statusBorder = success ? '#10b98140' : '#dc262640';

    return {
      subject: `${success ? '✅' : '❌'} ${success ? 'Udane' : 'Nieudane'} logowanie - ByteClinic`,
      html: `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${success ? 'Udane' : 'Nieudane'} logowanie - ByteClinic</title>
          <style>
            @media (max-width: 600px) {
              .container { padding: 10px !important; }
              .content { padding: 20px !important; }
              .text-center { text-align: center !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: ${statusBg};">
          <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${success ? '✅ Udane logowanie' : '❌ Nieudane logowanie'}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">ByteClinic - Powiadomienie o bezpieczeństwie</p>
            </div>

            <div class="content" style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div class="text-center" style="margin-bottom: 30px;">
                <h2 style="color: #1e293b; margin-bottom: 10px; font-size: 24px;">${success ? 'Logowanie zakończone sukcesem' : 'Próba logowania nie powiodła się'}</h2>
                <p style="color: #64748b; margin: 0; font-size: 16px;">${success ? 'Pomyślnie zalogowano do Twojego konta' : 'Wystąpił problem podczas próby zalogowania'}</p>
              </div>

              <div style="background-color: ${statusBg}; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusBorder}; margin: 20px 0;">
                <h4 style="margin: 0 0 15px 0; color: ${statusColor}; font-size: 16px;">📊 Szczegóły logowania</h4>
                <p style="margin: 5px 0; color: #334155; font-size: 14px;"><strong>Status:</strong> ${success ? 'Udane' : 'Nieudane'}</p>
                <p style="margin: 5px 0; color: #334155; font-size: 14px;"><strong>Data:</strong> ${new Date(timestamp).toLocaleString('pl-PL')}</p>
                <p style="margin: 5px 0; color: #334155; font-size: 14px;"><strong>Adres IP:</strong> ${ipAddress}</p>
                <p style="margin: 5px 0; color: #334155; font-size: 14px;"><strong>Lokalizacja:</strong> ${location || 'Nieznana'}</p>
              </div>

              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 15px 0; color: #334155; font-size: 16px;">💻 Informacje o urządzeniu</h4>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px; word-break: break-word;"><strong>Przeglądarka:</strong> ${userAgent}</p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>E-mail:</strong> ${email}</p>
              </div>

              ${!success ? `
              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 16px;">⚠️ Ważne</h4>
                <p style="margin: 5px 0; color: #7f1d1d; font-size: 14px;">Jeśli próbowałeś się zalogować, spróbuj ponownie. Jeśli nie - ktoś mógł próbować uzyskać dostęp do Twojego konta.</p>
              </div>
              ` : `
              <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">✅ Informacja</h4>
                <p style="margin: 5px 0; color: #047857; font-size: 14px;">Jeśli to nie Ty się logowałeś, natychmiast zmień hasło i skontaktuj się z nami.</p>
              </div>
              `}

              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #334155; font-size: 16px;">📞 Kontakt</h4>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Telefon: <a href="tel:+48724316523" style="color: #3b82f6;">+48 724 316 523</a></p>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Email: <a href="mailto:kontakt@byteclinic.pl" style="color: #3b82f6;">kontakt@byteclinic.pl</a></p>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b;">
                <p style="margin: 0; font-size: 16px;">Bezpieczeństwo Twojego konta jest naszym priorytetem</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🔒</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textContent
    };
  }
};

// Helper functions dla statusów
function getStatusColor(status) {
  const colors = {
    received: '#3b82f6', // blue
    diagnosed: '#f59e0b', // yellow
    in_progress: '#f97316', // orange
    testing: '#8b5cf6', // purple
    completed: '#10b981', // green
    ready: '#059669' // emerald
  };
  return colors[status] || '#6b7280';
}

function getStatusLabel(status) {
  const labels = {
    received: 'Przyjęte',
    diagnosed: 'Zdiagnozowane',
    in_progress: 'W naprawie',
    testing: 'Testowanie',
    completed: 'Zakończone',
    ready: 'Gotowe do odbioru'
  };
  return labels[status] || status;
}

function getStatusIcon(status) {
  const icons = {
    received: '📦',
    diagnosed: '🔍',
    in_progress: '🔧',
    testing: '🧪',
    completed: '✅',
    ready: '🎉'
  };
  return icons[status] || '📋';
}

// System bezpiecznych tokenów weryfikacyjnych
class VerificationTokenManager {
  constructor() {
    this.tokens = new Map();
    this.rateLimit = new Map();
  }

  // Generuj bezpieczny token
  generateToken(email, type = 'email_verification') {
    const now = Date.now();
    
    // Rate limiting - maksymalnie 5 tokenów na godzinę na email
    const userLimit = this.rateLimit.get(email) || { count: 0, resetTime: now + 3600000 };
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + 3600000;
    }
    
    if (userLimit.count >= EMAIL_CONFIG.security.maxTokensPerHour) {
      throw new Error('Przekroczono limit tokenów. Spróbuj ponownie za godzinę.');
    }
    
    userLimit.count++;
    this.rateLimit.set(email, userLimit);
    
    // Generuj token
    const tokenData = {
      token: crypto.randomUUID(),
      email,
      type,
      expiresAt: now + EMAIL_CONFIG.security.tokenExpiration,
      createdAt: now,
      used: false
    };
    
    this.tokens.set(tokenData.token, tokenData);
    
    // Automatyczne usuwanie po wygaśnięciu
    setTimeout(() => {
      this.tokens.delete(tokenData.token);
    }, EMAIL_CONFIG.security.tokenExpiration + 1000);
    
    return tokenData;
  }

  // Weryfikuj token
  verifyToken(token, email, type = 'email_verification') {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData) {
      return { valid: false, error: 'Token nie istnieje lub wygasł' };
    }
    
    if (tokenData.email !== email) {
      return { valid: false, error: 'Token nie pasuje do adresu email' };
    }
    
    if (tokenData.type !== type) {
      return { valid: false, error: 'Nieprawidłowy typ tokenu' };
    }
    
    if (tokenData.used) {
      return { valid: false, error: 'Token został już użyty' };
    }
    
    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(token);
      return { valid: false, error: 'Token wygasł' };
    }
    
    // Oznacz jako użyty
    tokenData.used = true;
    
    return { valid: true, tokenData };
  }

  // Sprawdź czy token jest ważny (bez używania)
  isValidToken(token, email, type = 'email_verification') {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData) return false;
    if (tokenData.email !== email) return false;
    if (tokenData.type !== type) return false;
    if (tokenData.used) return false;
    if (Date.now() > tokenData.expiresAt) return false;
    
    return true;
  }

  // Generuj URL weryfikacji
  generateVerificationUrl(baseUrl, token, email, type = 'email_verification') {
    const params = new URLSearchParams({
      token,
      email,
      type,
      timestamp: Date.now().toString()
    });
    
    return `${baseUrl}/verify-email?${params.toString()}`;
  }
}

// Globalna instancja menedżera tokenów
const tokenManager = new VerificationTokenManager();

// Helper function do usuwania HTML i tworzenia wersji tekstowych
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Usuń skrypty
    .replace(/<style[\s\S]*?<\/style>/gi, '') // Usuń style
    .replace(/<[^>]*>/g, '') // Usuń tagi HTML
    .replace(/&nbsp;/g, ' ') // Zamień &nbsp; na spację
    .replace(/&amp;/g, '&') // Zamień &amp; na &
    .replace(/&lt;/g, '<') // Zamień &lt; na <
    .replace(/&gt;/g, '>') // Zamień &gt; na >
    .replace(/&quot;/g, '"') // Zamień &quot; na "
    .replace(/\s+/g, ' ') // Zredukuj wielokrotne spacje
    .replace(/\n\s*\n/g, '\n\n') // Normalizuj linie
    .trim();
}

// Generuj wersję tekstową z HTML
function generateTextVersion(html) {
  const text = stripHtml(html);
  
  // Dodaj stopkę
  const footer = `
  
---
ByteClinic - Serwis, który ogarnia temat
Telefon: +48 724 316 523
Email: kontakt@byteclinic.pl
Strona: https://byteclinic.pl
  
Jeśli nie chcesz otrzymywać tych wiadomości, skontaktuj się z nami.
`;
  
  return text + footer;
}

// Główny serwis email z integracją Supabase Edge Functions
class EmailService {
  constructor() {
    this.config = EMAIL_CONFIG;
  }

  async sendEmail(to, template, data, options = {}) {
    try {
      console.log(`📧 Wysyłanie emaila: ${template} -> ${to}`);
      
      const emailContent = EMAIL_TEMPLATES[template](data);
      
      // Dodaj wersję tekstową jeśli nie istnieje
      if (!emailContent.text) {
        emailContent.text = generateTextVersion(emailContent.html);
      }
      
      // Log wysyłki
      await this.logEmail({
        to,
        template,
        subject: emailContent.subject,
        data,
        options
      });
      
      if (this.config.provider === 'supabase') {
        const result = await this.sendWithSupabase(to, emailContent, template, data);
        console.log(`✅ Email wysłany pomyślnie: ${template} -> ${to}`);
        
        // Zaktualizuj log po udanej wysyłce
        await this.updateEmailLog(to, template, 'sent', result);
        
        return result;
      } else {
        throw new Error(`Nieobsługiwany provider: ${this.config.provider}`);
      }
      
    } catch (error) {
      console.error(`❌ Błąd wysyłania emaila: ${template} -> ${to}`, error);
      
      // Log błędu
      await this.logEmailError(to, template, error);
      
      throw error;
    }
  }



  async sendWithSupabase(to, emailContent, template, data) {
    const functionName = this.getFunctionNameForTemplate(template);
    
    const response = await fetch(`${this.config.supabase.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.supabase.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        data: data,
        metadata: {
          template,
          timestamp: Date.now(),
          clientInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase Function error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return {
      success: true,
      provider: 'supabase',
      ...result
    };
  }

  // Queue-based sending dla większej niezawodności
  async sendEmailWithQueue(to, template, data, options = {}) {
    const emailJob = {
      to,
      template,
      data,
      options,
      subject: EMAIL_TEMPLATES[template](data).subject,
      html: EMAIL_TEMPLATES[template](data).html,
      text: EMAIL_TEMPLATES[template](data).text || generateTextVersion(EMAIL_TEMPLATES[template](data).html),
      metadata: {
        template,
        clientInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }
      }
    };

    emailQueue.add(emailJob);
    
    return {
      success: true,
      queued: true,
      jobId: emailJob.id,
      message: 'Email został dodany do kolejki wysyłki'
    };
  }

  // Walidacja tokenów
  validateVerificationToken(token, email, type = 'email_verification') {
    return tokenManager.verifyToken(token, email, type);
  }

  // Sprawdzenie ważności tokena (bez używania)
  isTokenValid(token, email, type = 'email_verification') {
    return tokenManager.isValidToken(token, email, type);
  }

  getFunctionNameForTemplate(template) {
    const functionMap = {
      'bookingConfirmation': 'notify-booking-confirmation',
      'repairStatusUpdate': 'notify-repair-status',
      'repairReady': 'notify-repair-ready',
      'appointmentReminder': 'notify-appointment-reminder',
      'emailConfirmation': 'notify-email-confirmation',
      'repairRequest': 'notify-new-diagnosis'
    };
    
    return functionMap[template] || 'notify-general';
  }

  // Metody pomocnicze dla konkretnych typów emaili
  async sendRepairRequest(repairData) {
    return this.sendEmail(repairData.email || 'admin@byteclinic.pl', 'repairRequest', repairData);
  }

  async sendBookingConfirmation(bookingData) {
    return this.sendEmail(bookingData.email, 'bookingConfirmation', bookingData);
  }

  async sendRepairStatusUpdate(repairData) {
    return this.sendEmail(repairData.email, 'repairStatusUpdate', repairData);
  }

  async sendRepairReady(repairData) {
    return this.sendEmail(repairData.email, 'repairReady', repairData);
  }

  async sendAppointmentReminder(bookingData) {
    return this.sendEmail(bookingData.email, 'appointmentReminder', bookingData);
  }

  async sendEmailConfirmation(confirmationData) {
    // Generuj token weryfikacyjny
    const tokenData = tokenManager.generateToken(confirmationData.email, 'email_verification');
    const confirmationUrl = tokenManager.generateVerificationUrl(
      window.location.origin,
      tokenData.token,
      confirmationData.email,
      'email_verification'
    );
    
    const dataWithToken = {
      ...confirmationData,
      confirmationUrl,
      token: tokenData.token
    };
    
    return this.sendEmail(confirmationData.email, 'emailConfirmation', dataWithToken);
  }

  // Nowe metody dla powiadomień bezpieczeństwa
  async sendPasswordReset(resetData) {
    // Generuj token resetu hasła
    const tokenData = tokenManager.generateToken(resetData.email, 'password_reset');
    const resetUrl = tokenManager.generateVerificationUrl(
      window.location.origin,
      tokenData.token,
      resetData.email,
      'password_reset'
    );
    
    const dataWithToken = {
      ...resetData,
      resetUrl,
      token: tokenData.token
    };
    
    return this.sendEmail(resetData.email, 'passwordReset', dataWithToken);
  }

  async sendProfileUpdateNotification(updateData) {
    return this.sendEmail(updateData.email, 'profileUpdate', updateData);
  }

  async sendLoginAlert(loginData) {
    return this.sendEmail(loginData.email, 'loginAlert', loginData);
  }

  // System logowania i monitoringu
  async logEmail(logData) {
    const emailLog = {
      id: crypto.randomUUID(),
      to: logData.to,
      template: logData.template,
      subject: logData.subject,
      status: 'pending',
      createdAt: Date.now(),
      data: logData.data,
      options: logData.options,
      attempts: 0
    };
    
    // Zapisz w localStorage jako backup
    const existingLogs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
    existingLogs.push(emailLog);
    
    // Zachowaj tylko ostatnie 100 logów
    if (existingLogs.length > 100) {
      existingLogs.splice(0, existingLogs.length - 100);
    }
    
    localStorage.setItem('emailLogs', JSON.stringify(existingLogs));
    
    console.log('📊 Email logged:', emailLog);
    return emailLog;
  }

  async updateEmailLog(to, template, status, result = null) {
    const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
    const logIndex = logs.findIndex(log => log.to === to && log.template === template && log.status === 'pending');
    
    if (logIndex !== -1) {
      logs[logIndex].status = status;
      logs[logIndex].sentAt = Date.now();
      logs[logIndex].result = result;
      
      localStorage.setItem('emailLogs', JSON.stringify(logs));
    }
  }

  async logEmailError(to, template, error) {
    const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
    const logIndex = logs.findIndex(log => log.to === to && log.template === template && log.status === 'pending');
    
    if (logIndex !== -1) {
      logs[logIndex].status = 'failed';
      logs[logIndex].error = error.message || error;
      logs[logIndex].failedAt = Date.now();
      
      localStorage.setItem('emailLogs', JSON.stringify(logs));
    }
  }

  // Pobierz logi emaili
  getEmailLogs(filter = {}) {
    const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
    
    return logs.filter(log => {
      if (filter.status && log.status !== filter.status) return false;
      if (filter.template && log.template !== filter.template) return false;
      if (filter.to && !log.to.includes(filter.to)) return false;
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  // Statystyki emaili
  getEmailStats() {
    const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
    const now = Date.now();
    const last24h = logs.filter(log => now - log.createdAt < 24 * 60 * 60 * 1000);
    
    return {
      total: logs.length,
      last24h: last24h.length,
      sent: logs.filter(log => log.status === 'sent').length,
      failed: logs.filter(log => log.status === 'failed').length,
      pending: logs.filter(log => log.status === 'pending').length,
      byTemplate: logs.reduce((acc, log) => {
        acc[log.template] = (acc[log.template] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // Batch wysyłka (np. dla przypomnień)
  async sendBatchEmails(emails) {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email.to, email.template, email.data))
    );
    
    return results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason : null,
      data: result.status === 'fulfilled' ? result.value : null
    }));
  }
}

export default new EmailService();