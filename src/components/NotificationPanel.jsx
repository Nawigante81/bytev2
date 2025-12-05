import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellRing, 
  CheckCheck, 
  Settings, 
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRealtimeNotifications, useNotificationPermission } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const getNotificationIcon = (type) => {
  const iconMap = {
    'repair_status_update': CheckCircle,
    'booking_confirmation': CheckCircle,
    'booking_reminder': Clock,
    'repair_request': Info,
    'system': Info,
    'error': AlertCircle
  };
  
  return iconMap[type] || Info;
};

const getNotificationColor = (type) => {
  const colorMap = {
    'repair_status_update': 'text-blue-500',
    'booking_confirmation': 'text-green-500',
    'booking_reminder': 'text-orange-500',
    'repair_request': 'text-purple-500',
    'system': 'text-gray-500',
    'error': 'text-red-500'
  };
  
  return colorMap[type] || 'text-gray-500';
};

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now - date) / 60000);
  
  if (diffInMinutes < 1) return 'Przed chwilą';
  if (diffInMinutes < 60) return `${diffInMinutes} min temu`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} godz. temu`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} dni temu`;
};

const NotificationPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { permission, requestPermission } = useNotificationPermission();
  
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh
  } = useRealtimeNotifications(user?.id);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleNotifications = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (granted) {
        toast({
          title: "✅ Powiadomienia włączone",
          description: "Będziesz otrzymywać powiadomienia o statusie Twoich napraw",
        });
      } else {
        toast({
          variant: "destructive",
          title: "❌ Powiadomienia zablokowane",
          description: "Włącz powiadomienia w ustawieniach przeglądarki",
        });
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await markAllAsRead();
      toast({
        title: "✅ Oznaczono jako przeczytane",
        description: "Wszystkie powiadomienia zostały oznaczone",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Błąd",
        description: "Nie udało się oznaczyć powiadomień",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refresh();
      toast({
        title: "✅ Odświeżono",
        description: "Powiadomienia zostały zaktualizowane",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Błąd odświeżania",
        description: "Nie udało się odświeżyć powiadomień",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted"
            onClick={() => setIsOpen(!isOpen)}
          >
            {unreadCount > 0 ? (
              <BellRing className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
            
            {!isConnected && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white"></div>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-80 max-h-96 overflow-hidden"
          sideOffset={5}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Powiadomienia</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} nowych
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleNotifications}>
                    {permission === 'granted' ? '🔔 Wyłącz powiadomienia' : '🔕 Włącz powiadomienia'}
                  </DropdownMenuItem>
                  
                  {unreadCount > 0 && (
                    <DropdownMenuItem onClick={handleMarkAllAsRead} disabled={isLoading}>
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Oznacz wszystkie jako przeczytane
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {isConnected ? 'Połączony z serwerem' : 'Brak połączenia'}
            </div>
          </div>

          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Brak powiadomień</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Powiadomienia pojawią się tutaj
                </p>
              </div>
            ) : (
              <div className="p-2">
                <AnimatePresence>
                  {notifications.map((notification) => {
                    const NotificationIcon = getNotificationIcon(notification.type);
                    const iconColor = getNotificationColor(notification.type);
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${
                          !notification.read_at ? 'bg-blue-50/50 border-blue-200/50' : 'border-transparent'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <NotificationIcon className={`w-5 h-5 mt-0.5 ${iconColor}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium leading-5 ${
                                !notification.read_at ? 'font-semibold' : ''
                              }`}>
                                {notification.title || 'Powiadomienie'}
                              </h4>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!notification.read_at && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1 leading-4">
                              {notification.content || notification.message || 'Brak treści'}
                            </p>
                            
                            {notification.action_url && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2 h-auto p-0 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(notification.action_url, '_blank');
                                }}
                              >
                                Zobacz szczegóły →
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
          
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-3">
                <Button 
                  variant="ghost" 
                  className="w-full h-8 text-xs"
                  onClick={() => {}}
                >
                  Zobacz wszystkie powiadomienia
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NotificationPanel;