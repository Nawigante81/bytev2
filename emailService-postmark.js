// Serwis do obsługi emaili z integracją Postmark
// Aktualizacja: 2025-12-03 - Integracja z Postmark API

// Config - Postmark jako główny provider
const EMAIL_CONFIG = {
  provider: 'postmark', // Zmieniono z 'supabase' na 'postmark'
  postmark: {
    apiToken: 'd8babbf2-9ad2-49f1-9d6d-e16e20e003268',
    fromEmail: 'serwis@byteclinic.pl',
    fromName: 'ByteClinic Serwis',
    replyTo: 'kontakt@byteclinic.pl',
    smtp: {
      host: 'smtp.postmarkapp.com',
      port: 587,
      secure: true,
      auth: {
        user: 'd8babbf2-9ad2-49f1-9d6d-e16e20e003268',
        pass: 'd8babbf2-9ad2-49f1-9d6d-e16e20e003268'
      }
    }
  },
  // Fallback do Supabase (jeśli Postmark nie działa)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  }
};

// Templates emaili (identyczne jak w oryginalnym pliku)
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
    `,
    textContent: `Potwierdzenie rezerwacji #${bookingData.bookingId}

Szczegóły wizyty:
- Data: ${bookingData.date}
- Godzina: ${bookingData.time}
- Usługa: ${bookingData.service}
- Czas trwania: ${bookingData.duration} minut
- Cena: ${bookingData.price === 0 ? 'Darmowe' : `${bookingData.price} PLN`}

Informacje o wizycie:
- Miejsce: Serwis ByteClinic, Zgorzelec
- Prosimy o punktualne przybycie

Link do śledzenia: https://byteclinic.pl/sledzenie?ref=${bookingData.bookingId}

Kontakt:
- Telefon: +48 724 316 523
- Email: kontakt@byteclinic.pl

Zespół ByteClinic`
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
    `,
    textContent: `Nowe zgłoszenie naprawcze - ${repairData.id}

Dane klienta:
- Imię: ${repairData.name}
- Email: ${repairData.email}
- Telefon: ${repairData.phone}

Urządzenie: ${repairData.device}

Opis problemu: ${repairData.message}

Data zgłoszenia: ${new Date().toLocaleDateString('pl-PL')}

Zespół ByteClinic`
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
            <div style="display: inline-block; padding: 10px 20px; border-radius: 25px; font-weight: bold; margin-bottom: 15px; background-color: ${getStatusColor(repairData.status)}20; color: ${getStatusColor(repairData.status)}; border: 2px solid ${getStatusColor(repairData.status)}40;">
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
    `,
    textContent: `Status naprawy #${repairData.repairId} - ${repairData.status}

Szczegóły:
- Urządzenie: ${repairData.device}
- Problem: ${repairData.issue}
- Postęp: ${repairData.progress}%
- Technik: ${repairData.technician}
${repairData.notes ? `- Komentarz: ${repairData.notes}` : ''}

Śledź postęp: https://byteclinic.pl/sledzenie?ref=${repairData.repairId}

Zespół ByteClinic`
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
            <p style="margin: 5px 0; color: #78350f;"><strong>Adres:</strong> Serwis ByteClinic, ul. Przykładowa 123, Zgorzelec</p>
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
    `,
    textContent: `🎉 Naprawa #${repairData.repairId} gotowa do odbioru!

Podsumowanie:
- Urządzenie: ${repairData.device}
- Problem: ${repairData.issue}
- Cena: ${repairData.finalPrice} PLN
- Czas realizacji: ${repairData.duration}

Odbiór:
- Adres: Serwis ByteClinic, ul. Przykładowa 123, Zgorzelec
- Godziny: Pon-Pt 9:00-17:00
- Zabierz dowód osobisty

Tel: +48 724 316 523
Faktura: https://byteclinic.pl/sledzenie?ref=${repairData.repairId}

Zespół ByteClinic`
  })
};

// Helper functions (identyczne jak w oryginalnym pliku)
function getStatusColor(status) {
  const colors = {
    received: '#3b82f6',
    diagnosed: '#f59e0b',
    in_progress: '#f97316',
    testing: '#8b5cf6',
    completed: '#10b981',
    ready: '#059669'
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

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Główny serwis email z integracją Postmark
class EmailService {
  constructor() {
    this.config = EMAIL_CONFIG;
    this.logger = console;
  }

  async sendEmail(to, template, data) {
    try {
      this.logger.log(`📧 Wysyłanie emaila: ${template} -> ${to}`);
      
      const emailContent = EMAIL_TEMPLATES[template](data);
      
      let result;
      
      if (this.config.provider === 'postmark') {
        result = await this.sendWithPostmark(to, emailContent, template, data);
      } else if (this.config.provider === 'supabase') {
        result = await this.sendWithSupabase(to, emailContent, template, data);
      } else {
        throw new Error(`Nieobsługiwany provider: ${this.config.provider}`);
      }
      
      this.logger.log(`✅ Email wysłany pomyślnie: ${template} -> ${to}`);
      return result;
      
    } catch (error) {
      this.logger.error(`❌ Błąd wysyłania emaila: ${template} -> ${to}`, error);
      throw error;
    }
  }

  async sendWithPostmark(to, emailContent, template, data) {
    const postmarkData = {
      From: this.config.postmark.fromEmail,
      To: to,
      Subject: emailContent.subject,
      HtmlBody: emailContent.html,
      TextBody: emailContent.textContent || stripHtml(emailContent.html),
      ReplyTo: this.config.postmark.replyTo,
      Headers: [
        { Name: 'X-PM-Message-Stream', Value: 'outbound' },
        { Name: 'X-PM-Template-Name', Value: template },
        { Name: 'X-PM-Source', Value: 'byteclinic-system' }
      ],
      TrackOpens: true,
      TrackLinks: 'HtmlOnly',
      Metadata: {
        template,
        timestamp: new Date().toISOString(),
        source: 'byteclinic-app'
      }
    };

    // Dodaj dodatkowe metadane jeśli dostępne
    if (data.repairId || data.id) {
      postmarkData.Metadata.repairId = data.repairId || data.id;
    }
    if (data.bookingId) {
      postmarkData.Metadata.bookingId = data.bookingId;
    }

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.config.postmark.apiToken
      },
      body: JSON.stringify(postmarkData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error('Postmark API Error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText
      });
      throw new Error(`Postmark error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    // Loguj szczegóły wysyłki dla debugowania
    this.logger.log('Postmark Response:', {
      messageId: result.MessageID,
      submittedAt: result.SubmittedAt,
      to: result.To,
      template: template
    });

    return {
      success: true,
      provider: 'postmark',
      messageId: result.MessageID,
      submittedAt: result.SubmittedAt,
      to: result.To,
      template,
      data: result
    };
  }

  async sendWithSupabase(to, emailContent, template, data) {
    // Fallback do Supabase jeśli Postmark nie działa
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
        data: data
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

  getFunctionNameForTemplate(template) {
    const functionMap = {
      'repairRequest': 'notify-new-diagnosis',
      'bookingConfirmation': 'booking-api',
      'repairStatusUpdate': 'notify-system',
      'repairReady': 'notify-system',
      'emailConfirmation': 'notify-system'
    };
    
    return functionMap[template] || 'notify-system';
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
    // Tymczasowo używamy bookingConfirmation template dla przypomnień
    const reminderData = { ...bookingData, isReminder: true };
    return this.sendEmail(bookingData.email, 'bookingConfirmation', reminderData);
  }

  async sendEmailConfirmation(confirmationData) {
    return this.sendEmail(confirmationData.email, 'emailConfirmation', confirmationData);
  }

  // Batch wysyłka
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

  // Test połączenia
  async testConnection() {
    try {
      const testResult = await this.sendWithPostmark(
        'test@byteclinic.pl',
        {
          subject: 'Test połączenia - ByteClinic',
          html: '<p>To jest test połączenia z systemem powiadomień.</p>',
          textContent: 'To jest test połączenia z systemem powiadomień.'
        },
        'test',
        { test: true }
      );
      
      return { 
        success: true, 
        provider: 'postmark',
        messageId: testResult.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Test połączenia nie powiódł się:', error);
      return { 
        success: false, 
        error: error.message,
        provider: 'postmark'
      };
    }
  }
}

// Export singleton instance
export default new EmailService();