// Serwis do zarządzania powiadomieniami i przypomnieniami
import emailService from './emailService';

class NotificationService {
  constructor() {
    this.scheduledReminders = new Map();
    this.checkInterval = null;
  }

  // Rozpocznij sprawdzanie przypomnień (uruchomić przy starcie aplikacji)
  startReminderService() {
    // Sprawdzaj co 5 minut
    this.checkInterval = setInterval(() => {
      this.checkPendingReminders();
    }, 5 * 60 * 1000);

    console.log('✅ Uruchomiono serwis przypomnień');
  }

  // Zatrzymaj serwis przypomnień
  stopReminderService() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('⏹️ Zatrzymano serwis przypomnień');
  }

  // Zaplanuj przypomnienie o wizycie
  scheduleAppointmentReminder(bookingData, hoursBefore = 24) {
    const appointmentTime = new Date(`${bookingData.date} ${bookingData.time}`);
    const reminderTime = new Date(appointmentTime.getTime() - (hoursBefore * 60 * 60 * 1000));
    
    const reminderId = `reminder_${bookingData.bookingId}`;
    const timeUntilReminder = reminderTime.getTime() - Date.now();

    if (timeUntilReminder > 0) {
      const reminder = setTimeout(() => {
        this.sendAppointmentReminder(bookingData);
        this.scheduledReminders.delete(reminderId);
      }, timeUntilReminder);

      this.scheduledReminders.set(reminderId, reminder);
      console.log(`📅 Zaplanowano przypomnienie dla ${bookingData.bookingId} za ${hoursBefore}h`);
    } else {
      console.warn(`⚠️ Przypomnienie dla ${bookingData.bookingId} jest już spóźnione`);
    }
  }

  // Sprawdź oczekujące przypomnienia (backup)
  async checkPendingReminders() {
    try {
      // TODO: W przyszłości sprawdzać w bazie danych zaplanowane przypomnienia
      // Na razie sprawdzamy tylko localStorage
      const pendingReminders = localStorage.getItem('pendingReminders');
      if (pendingReminders) {
        const reminders = JSON.parse(pendingReminders);
        const now = Date.now();
        
        for (const reminder of reminders) {
          if (reminder.sendAt <= now && !reminder.sent) {
            await this.sendAppointmentReminder(reminder.data);
            reminder.sent = true;
          }
        }
        
        localStorage.setItem('pendingReminders', JSON.stringify(reminders));
      }
    } catch (error) {
      console.error('Błąd sprawdzania przypomnień:', error);
    }
  }

  // Wyślij przypomnienie o wizycie
  async sendAppointmentReminder(bookingData) {
    try {
      await emailService.sendAppointmentReminder(bookingData);
      console.log(`📧 Wysłano przypomnienie o wizycie: ${bookingData.bookingId}`);
      
      // TODO: Zapisz w bazie danych że przypomnienie zostało wysłane
    } catch (error) {
      console.error('Błąd wysyłania przypomnienia:', error);
    }
  }

  // Wyślij powiadomienie o zmianie statusu naprawy
  async sendRepairStatusUpdate(repairData, previousStatus) {
    try {
      // Tylko wysyłaj email jeśli status się zmienił i nie jest to status "received"
      if (previousStatus !== repairData.status && repairData.status !== 'received') {
        await emailService.sendRepairStatusUpdate(repairData);
        console.log(`🔧 Wysłano aktualizację statusu naprawy: ${repairData.repairId} - ${repairData.status}`);
      }
    } catch (error) {
      console.error('Błąd wysyłania aktualizacji statusu:', error);
    }
  }

  // Wyślij powiadomienie o gotowej naprawie
  async sendRepairReadyNotification(repairData) {
    try {
      await emailService.sendRepairReady(repairData);
      console.log(`🎉 Wysłano powiadomienie o gotowej naprawie: ${repairData.repairId}`);
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o gotowej naprawie:', error);
    }
  }

  // Zapisz przypomnienie w localStorage (backup)
  saveReminderToStorage(bookingData, hoursBefore = 24) {
    const appointmentTime = new Date(`${bookingData.date} ${bookingData.time}`);
    const reminderTime = new Date(appointmentTime.getTime() - (hoursBefore * 60 * 60 * 1000));
    
    const reminder = {
      id: bookingData.bookingId,
      sendAt: reminderTime.getTime(),
      sent: false,
      data: bookingData
    };

    const pendingReminders = JSON.parse(localStorage.getItem('pendingReminders') || '[]');
    pendingReminders.push(reminder);
    localStorage.setItem('pendingReminders', JSON.stringify(pendingReminders));
  }

  // Pobierz zaplanowane przypomnienia z localStorage
  getScheduledReminders() {
    return JSON.parse(localStorage.getItem('pendingReminders') || '[]');
  }

  // Anuluj przypomnienie
  cancelReminder(bookingId) {
    const reminderId = `reminder_${bookingId}`;
    
    // Usuń z active reminders
    if (this.scheduledReminders.has(reminderId)) {
      clearTimeout(this.scheduledReminders.get(reminderId));
      this.scheduledReminders.delete(reminderId);
    }
    
    // Usuń z localStorage
    const pendingReminders = this.getScheduledReminders().filter(r => r.id !== bookingId);
    localStorage.setItem('pendingReminders', JSON.stringify(pendingReminders));
    
    console.log(`🚫 Anulowano przypomnienie: ${bookingId}`);
  }

  // Batch operacje dla przypomnień
  async sendBulkReminders(reminders) {
    try {
      const emailPromises = reminders.map(reminder => 
        this.sendAppointmentReminder(reminder.data)
      );
      
      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`📊 Wysłano ${successCount}/${reminders.length} przypomnień`);
      return { success: successCount, total: reminders.length };
    } catch (error) {
      console.error('Błąd wysyłania przypomnień grupowych:', error);
      throw error;
    }
  }

  // Utwórz przypomnienie o wizycie + zapisz w storage
  createAppointmentReminder(bookingData, hoursBefore = 24) {
    // Zaplanuj w pamięci
    this.scheduleAppointmentReminder(bookingData, hoursBefore);
    
    // Zapisz w localStorage jako backup
    this.saveReminderToStorage(bookingData, hoursBefore);
  }

  // Statystyki powiadomień
  getNotificationStats() {
    const activeReminders = this.scheduledReminders.size;
    const pendingStorageReminders = this.getScheduledReminders().filter(r => !r.sent).length;
    
    return {
      activeInMemory: activeReminders,
      pendingInStorage: pendingStorageReminders,
      total: activeReminders + pendingStorageReminders
    };
  }
}

// Singleton instance
export default new NotificationService();