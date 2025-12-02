// Hook do obsługi powiadomień w komponentach React
import { useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import notificationService from '@/services/notificationService';
import emailService from '@/services/emailService';

export const useNotifications = () => {
  const { toast } = useToast();

  // Rozpocznij serwis przypomnień przy montowaniu
  useEffect(() => {
    notificationService.startReminderService();
    
    // Cleanup przy odmontowaniu
    return () => {
      notificationService.stopReminderService();
    };
  }, []);

  // Funkcje pomocnicze
  const sendBookingEmail = useCallback(async (bookingData) => {
    try {
      await emailService.sendBookingConfirmation(bookingData);
      toast({
        title: "📧 Email wysłany",
        description: `Potwierdzenie zostało wysłane na ${bookingData.email}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd wysyłania emaila",
        description: "Nie udało się wysłać potwierdzenia. Skontaktuj się z nami.",
      });
    }
  }, [toast]);

  const scheduleAppointmentReminder = useCallback((bookingData, hoursBefore = 24) => {
    try {
      notificationService.createAppointmentReminder(bookingData, hoursBefore);
      toast({
        title: "⏰ Przypomnienie ustawione",
        description: `Przypomnimy Ci o wizycie ${hoursBefore}h wcześniej`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd ustawiania przypomnienia",
        description: "Nie udało się ustawić przypomnienia.",
      });
    }
  }, [toast]);

  const sendRepairStatusEmail = useCallback(async (repairData, previousStatus) => {
    try {
      await notificationService.sendRepairStatusUpdate(repairData, previousStatus);
      if (previousStatus !== repairData.status) {
        toast({
          title: "📧 Powiadomienie wysłane",
          description: "Klient otrzyma email o zmianie statusu",
        });
      }
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o statusie:', error);
    }
  }, [toast]);

  const sendRepairReadyEmail = useCallback(async (repairData) => {
    try {
      await notificationService.sendRepairReadyNotification(repairData);
      toast({
        title: "🎉 Powiadomienie wysłane",
        description: "Klient otrzymał informację o gotowej naprawie",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd wysyłania powiadomienia",
        description: "Nie udało się wysłać powiadomienia o gotowej naprawie.",
      });
    }
  }, [toast]);

  const cancelAppointmentReminder = useCallback((bookingId) => {
    try {
      notificationService.cancelReminder(bookingId);
      toast({
        title: "🚫 Przypomnienie anulowane",
        description: "Przypomnienie o wizycie zostało usunięte",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd anulowania",
        description: "Nie udało się anulować przypomnienia.",
      });
    }
  }, [toast]);

  const getNotificationStats = useCallback(() => {
    return notificationService.getNotificationStats();
  }, []);

  return {
    // Email functions
    sendBookingEmail,
    sendRepairStatusEmail,
    sendRepairReadyEmail,
    
    // Reminder functions
    scheduleAppointmentReminder,
    cancelAppointmentReminder,
    
    // Utility functions
    getNotificationStats
  };
};

// Hook specjalnie dla komponentu Booking
export const useBookingNotifications = () => {
  const notifications = useNotifications();

  const completeBooking = useCallback(async (bookingData) => {
    // Wyślij email potwierdzający
    await notifications.sendBookingEmail(bookingData);
    
    // Zaplanuj przypomnienie na 24h przed wizytą
    notifications.scheduleAppointmentReminder(bookingData, 24);
    
    return {
      emailSent: true,
      reminderScheduled: true
    };
  }, [notifications]);

  return {
    ...notifications,
    completeBooking
  };
};

// Hook specjalnie dla systemu śledzenia napraw
export const useRepairNotifications = () => {
  const notifications = useNotifications();

  const updateRepairStatus = useCallback(async (repairData, previousStatus) => {
    // Wyślij email jeśli status się zmienił
    if (previousStatus !== repairData.status) {
      await notifications.sendRepairStatusEmail(repairData, previousStatus);
      
      // Jeśli status to "ready", wyślij specjalne powiadomienie
      if (repairData.status === 'ready' || repairData.status === 'completed') {
        await notifications.sendRepairReadyEmail(repairData);
      }
    }
    
    return { statusUpdated: true, emailSent: previousStatus !== repairData.status };
  }, [notifications]);

  return {
    ...notifications,
    updateRepairStatus
  };
};

export default useNotifications;