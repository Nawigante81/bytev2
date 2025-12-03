// Serwis do obsługi emaili
// Integracja z Supabase Edge Functions

// Config - używa Supabase Edge Functions
const EMAIL_CONFIG = {
  provider: 'supabase',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  fromEmail: 'noreply@byteclinic.pl',
  fromName: 'ByteClinic Serwis'
};

// Templates dla różnych typów emaili
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

  emailConfirmation: (confirmationData) => ({
    subject: `✅ Potwierdź swój adres e-mail - ByteClinic`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ByteClinic</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Potwierdzenie rejestracji</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin-bottom: 10px;">Witaj w ByteClinic!</h2>
            <p style="color: #64748b; margin: 0;">Potwierdź swój adres e-mail, aby aktywować konto.</p>
          </div>

          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>E-mail:</strong> ${confirmationData.email}</p>
            <p style="margin: 5px 0;"><strong>Data rejestracji:</strong> ${new Date().toLocaleDateString('pl-PL')}</p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">🔐 Bezpieczeństwo</h4>
            <p style="margin: 5px 0; color: #78350f;">Link potwierdzający jest ważny przez 24 godziny.</p>
            <p style="margin: 5px 0; color: #78350f;">Jeśli nie rejestrowałeś się w ByteClinic, zignoruj tę wiadomość.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationData.confirmationUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              ✅ Potwierdź adres e-mail
            </a>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #334155;">📞 Potrzebujesz pomocy?</h4>
            <p style="margin: 5px 0;">Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:</p>
            <p style="margin: 5px 0; word-break: break-all; color: #3b82f6; font-size: 14px;">${confirmationData.confirmationUrl}</p>
            <p style="margin: 5px 0;">Telefon: <a href="tel:+48724316523" style="color: #3b82f6;">+48 724 316 523</a></p>
            <p style="margin: 5px 0;">Email: <a href="mailto:kontakt@byteclinic.pl" style="color: #3b82f6;">kontakt@byteclinic.pl</a></p>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b;">
            <p style="margin: 0;">Dziękujemy za rejestrację!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Zespół ByteClinic 🚀</p>
          </div>
        </div>
      </div>
    `
  })
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

// Główny serwis email
class EmailService {
  constructor() {
    this.config = EMAIL_CONFIG;
  }

  async sendEmail(to, template, data) {
    try {
      const emailContent = EMAIL_TEMPLATES[template](data);
      
      if (this.config.provider === 'supabase') {
        return await this.sendWithSupabase(to, emailContent, template, data);
      } else {
        throw new Error('Nieobsługiwany provider email');
      }
    } catch (error) {
      console.error('Błąd wysyłania emaila:', error);
      throw error;
    }
  }

  async sendWithSupabase(to, emailContent, template, data) {
    // Implementacja z Supabase Edge Functions
    const functionName = this.getFunctionNameForTemplate(template);
    
    const response = await fetch(`${this.config.supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
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
      console.error('Supabase Function Error:', errorText);
      throw new Error(`Supabase Function error: ${response.statusText}`);
    }

    return await response.json();
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
    return this.sendEmail(confirmationData.email, 'emailConfirmation', confirmationData);
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