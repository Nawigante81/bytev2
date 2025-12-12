// Panel administracyjny do zarządzania powiadomieniami
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Clock, 
  Send, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Settings,
  BarChart3,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import notificationService from '@/services/notificationService';
import emailService from '@/services/emailService';

const AdminNotificationsPanel = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalReminders: 0,
    activeReminders: 0,
    sentToday: 0,
    failedEmails: 0
  });
  const [testEmail, setTestEmail] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [bulkAction, setBulkAction] = useState({
    type: '',
    target: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Symulacja danych
  const [mockData] = useState({
    recentBookings: [
      {
        id: 'BC-2025-001',
        customer: 'Anna Nowak',
        email: 'anna@example.com',
        date: '2025-12-03',
        time: '10:00',
        service: 'Diagnoza laptopa',
        reminderStatus: 'scheduled'
      },
      {
        id: 'BC-2025-002', 
        customer: 'Tomasz Kowalski',
        email: 'tomasz@example.com',
        date: '2025-12-04',
        time: '14:30',
        service: 'Szybka naprawa',
        reminderStatus: 'sent'
      }
    ],
    recentRepairs: [
      {
        id: 'BC-2025-101',
        customer: 'Katarzyna Dąbrowska',
        email: 'kasia@example.com',
        device: 'MacBook Pro',
        status: 'in_progress',
        lastUpdate: '2025-12-01T15:30:00Z'
      },
      {
        id: 'BC-2025-102',
        customer: 'Piotr Wiśniewski', 
        email: 'piotr@example.com',
        device: 'Dell Latitude',
        status: 'ready',
        lastUpdate: '2025-12-01T16:45:00Z'
      }
    ]
  });

  // Załaduj statystyki
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Aktualizuj co 30 sekund
    return () => clearInterval(interval);
  }, []);

  const loadStats = () => {
    const notificationStats = notificationService.getNotificationStats();
    setStats({
      totalReminders: notificationStats.total,
      activeReminders: notificationStats.activeInMemory,
      sentToday: Math.floor(Math.random() * 20) + 5, // Symulacja
      failedEmails: Math.floor(Math.random() * 3)    // Symulacja
    });
  };

  const processPendingNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await emailService.processPendingNotifications();
      toast({
        title: 'Przetwarzanie kolejki zakonczone',
        description: `Sent: ${result?.sent ?? 0}, Failed: ${result?.failed ?? 0}`,
      });
      loadStats();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Blad przetwarzania kolejki',
        description: error?.message || 'Nie udalo sie przetworzyc powiadomien',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.to || !testEmail.subject) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji",
        description: "Wypełnij wszystkie pola",
      });
      return;
    }

    setIsLoading(true);
    try {
      await emailService.sendEmail(testEmail.to, 'bookingConfirmation', {
        bookingId: 'TEST-' + Date.now(),
        email: testEmail.to,
        name: 'Test User',
        date: '2025-12-10',
        time: '12:00',
        service: 'Test Email',
        duration: 60,
        price: 99
      });
      
      toast({
        title: "✅ Email testowy wysłany",
        description: `Wysłano na adres: ${testEmail.to}`,
      });
      
      setTestEmail({ to: '', subject: '', message: '' });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd wysyłania",
        description: "Nie udało się wysłać emaila testowego",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendBulkReminders = async () => {
    if (!bulkAction.target || !bulkAction.message) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji", 
        description: "Wybierz odbiorców i wpisz wiadomość",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Symulacja wysyłki grupowej
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "📧 Wiadomości grupowe wysłane",
        description: `Wysłano do ${bulkAction.target} odbiorców`,
      });
      
      setBulkAction({ type: '', target: '', message: '' });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd wysyłki grupowej",
        description: "Nie udało się wysłać wiadomości",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendRepairStatusUpdate = async (repair) => {
    try {
      await emailService.sendRepairStatusUpdate({
        repairId: repair.id,
        email: repair.email,
        device: repair.device,
        issue: 'Aktualizacja statusu',
        status: repair.status,
        progress: repair.status === 'ready' ? 100 : 65,
        technician: 'Jan Technik',
        estimatedCompletion: '2025-12-05T16:00:00Z',
        notes: `Status został zaktualizowany na: ${repair.status}`
      });
      
      toast({
        title: "✅ Powiadomienie wysłane",
        description: `Klient ${repair.customer} otrzymał aktualizację`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd wysyłki",
        description: "Nie udało się wysłać powiadomienia",
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      sent: 'bg-green-500/20 text-green-300 border-green-500/30',
      failed: 'bg-red-500/20 text-red-300 border-red-500/30',
      in_progress: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300 mb-2">
          📧 Panel Powiadomień
        </h2>
        <p className="text-muted-foreground">
          Zarządzaj emailami, przypomnieniami i powiadomieniami
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="outline" onClick={loadStats} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Odswiez statystyki
          </Button>
          <Button variant="secondary" onClick={processPendingNotifications} disabled={isLoading}>
            <RefreshCw className={isLoading ? "w-4 h-4 mr-2 animate-spin" : "w-4 h-4 mr-2"} />
            Przetworz pending
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold font-mono">{stats.totalReminders}</div>
            <div className="text-sm text-muted-foreground">Aktywne przypomnienia</div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <Send className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold font-mono">{stats.sentToday}</div>
            <div className="text-sm text-muted-foreground">Wysłane dzisiaj</div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold font-mono">{stats.failedEmails}</div>
            <div className="text-sm text-muted-foreground">Nieudane wysyłki</div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold font-mono">{stats.activeReminders}</div>
            <div className="text-sm text-muted-foreground">W pamięci systemu</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bookings">📅 Przypomnienia wizyt</TabsTrigger>
          <TabsTrigger value="repairs">🔧 Statusy napraw</TabsTrigger>
          <TabsTrigger value="test">🧪 Email testowy</TabsTrigger>
          <TabsTrigger value="bulk">📬 Wysyłka grupowa</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Nadchodzące wizyty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockData.recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-semibold">{booking.customer}</h4>
                      <p className="text-sm text-muted-foreground">{booking.service} - {booking.date} {booking.time}</p>
                      <p className="text-xs text-muted-foreground">#{booking.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(booking.reminderStatus)}>
                        {booking.reminderStatus === 'scheduled' ? 'Zaplanowane' : 
                         booking.reminderStatus === 'sent' ? 'Wysłane' : 'Spóźnione'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Wyślij ponownie
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repairs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Statusy napraw
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockData.recentRepairs.map((repair) => (
                  <div key={repair.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-semibold">{repair.customer}</h4>
                      <p className="text-sm text-muted-foreground">{repair.device}</p>
                      <p className="text-xs text-muted-foreground">#{repair.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(repair.status)}>
                        {repair.status === 'in_progress' ? 'W naprawie' : 'Gotowe'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => sendRepairStatusUpdate(repair)}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Wyślij aktualizację
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Email testowy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Adres email</label>
                <Input
                  value={testEmail.to}
                  onChange={(e) => setTestEmail({...testEmail, to: e.target.value})}
                  placeholder="test@example.com"
                  type="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Temat</label>
                <Input
                  value={testEmail.subject}
                  onChange={(e) => setTestEmail({...testEmail, subject: e.target.value})}
                  placeholder="Test email from ByteClinic"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Wiadomość (opcjonalna)</label>
                <Textarea
                  value={testEmail.message}
                  onChange={(e) => setTestEmail({...testEmail, message: e.target.value})}
                  placeholder="Dodatkowa wiadomość..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={sendTestEmail}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Wyślij email testowy
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Wysyłka grupowa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Typ odbiorców</label>
                <Select value={bulkAction.type} onValueChange={(value) => setBulkAction({...bulkAction, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ odbiorców" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-bookings">Wszystkie nadchodzące wizyty</SelectItem>
                    <SelectItem value="all-repairs">Wszystkie aktywne naprawy</SelectItem>
                    <SelectItem value="custom">Lista niestandardowa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Liczba odbiorców</label>
                <Input
                  value={bulkAction.target}
                  onChange={(e) => setBulkAction({...bulkAction, target: e.target.value})}
                  placeholder="Liczba lub lista emaili"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Wiadomość</label>
                <Textarea
                  value={bulkAction.message}
                  onChange={(e) => setBulkAction({...bulkAction, message: e.target.value})}
                  placeholder="Wpisz wiadomość do wysłania..."
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={sendBulkReminders}
                disabled={isLoading || !bulkAction.type || !bulkAction.target}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Wyślij do wszystkich
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNotificationsPanel;
