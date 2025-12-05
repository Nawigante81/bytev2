import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

// Hook do powiadomień o rezerwacjach
export const useBookingNotifications = () => {
  const { toast } = useToast();
  
  const completeBooking = useCallback((bookingData) => {
    // Toast z potwierdzeniem
    toast({
      title: "✅ Rezerwacja potwierdzona!",
      description: `Wizyta ${bookingData.service} dnia ${bookingData.date} o godzinie ${bookingData.time}`,
    });
    
    // Przeglądarka może pokazać powiadomienie
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Rezerwacja potwierdzona!', {
        body: `Wizyta ${bookingData.service} dnia ${bookingData.date} o godzinie ${bookingData.time}`,
        icon: '/logo.png'
      });
    }
  }, [toast]);
  
  return { completeBooking };
};

// Hook do powiadomień o naprawach
export const useRepairNotifications = () => {
  const { toast } = useToast();
  
  const sendRepairStatusEmail = useCallback(async (repair, oldStatus, newStatus) => {
    try {
      const { data, error } = await supabase.functions.invoke('notify-repair-status-change', {
        body: {
          repair,
          old_status: oldStatus,
          new_status: newStatus
        }
      });
      
      if (error) {
        console.error('Błąd wysyłania powiadomienia:', error);
        return false;
      }
      
      console.log('Powiadomienie wysłane:', data);
      return true;
    } catch (error) {
      console.error('Błąd funkcji Edge:', error);
      return false;
    }
  }, [toast]);
  
  const sendRepairReadyEmail = useCallback(async (repair) => {
    try {
      // Wysyłanie specjalnego powiadomienia o gotowości do odbioru
      const { data, error } = await supabase.functions.invoke('notify-repair-status-change', {
        body: {
          repair,
          old_status: 'repair_completed',
          new_status: 'ready_for_pickup'
        }
      });
      
      if (error) {
        console.error('Błąd wysyłania powiadomienia:', error);
        return false;
      }
      
      toast({
        title: "🔔 Naprawa gotowa!",
        description: "Twoja naprawa jest gotowa do odbioru. Sprawdź email i odbierz urządzenie.",
      });
      
      return true;
    } catch (error) {
      console.error('Błąd funkcji Edge:', error);
      return false;
    }
  }, [toast]);
  
  return { sendRepairStatusEmail, sendRepairReadyEmail };
};

// Hook do powiadomień w czasie rzeczywistym
export const useRealtimeNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Błąd oznaczania jako przeczytane:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Błąd oznaczania wszystkich jako przeczytane:', error);
    }
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);
    } catch (error) {
      console.error('Błąd pobierania powiadomień:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Subskrypcja Realtime dla nowych powiadomień
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Nowe powiadomienie!', payload);
          
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Toast dla nowego powiadomienia
          if (!document.hidden) {
            toast({
              title: newNotification.title || "🔔 Nowe powiadomienie",
              description: newNotification.content || newNotification.message,
              variant: newNotification.type === 'repair_status_update' ? 'default' : 'default'
            });
          }
          
          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title || "Nowe powiadomienie", {
              body: newNotification.content || newNotification.message,
              icon: '/logo.png',
              tag: `notification-${newNotification.id}`
            });
          }
        }
      )
      .on('system', {}, (payload) => {
        if (payload.event === 'connected') {
          setIsConnected(true);
        } else if (payload.event === 'disconnected') {
          setIsConnected(false);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchNotifications, toast]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};

// Hook do ustawiania uprawnień przeglądarki
export const useNotificationPermission = () => {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Ta przeglądarka nie obsługuje powiadomień');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Powiadomienia zostały odrzucone przez użytkownika');
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);
    return permission === 'granted';
  }, []);

  return { permission, requestPermission };
};