import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Truck, 
  Wrench, 
  Camera,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Download,
  Star,
  BarChart3,
  User,
  Lock,
  LogIn
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useRepairNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';

// Symulacja danych napraw
const generateRepairData = () => {
  return [
    {
      id: 'BC-2025-001',
      customerName: 'Anna Nowak',
      device: 'MacBook Pro 2020',
      issue: 'Problem z ładowaniem',
      status: 'in_progress',
      progress: 65,
      createdAt: '2025-11-28T10:30:00Z',
      estimatedCompletion: '2025-12-02T16:00:00Z',
      technician: 'Piotr Majewski',
      price: 299,
      description: 'Wymiana złącza MagSafe, czyszczenie wentylatorów',
      timeline: [
        { time: '2025-11-28T10:30:00Z', status: 'received', title: 'Otrzymano zlecenie', description: 'Urządzenie zostało przyjęte do serwisu' },
        { time: '2025-11-28T14:15:00Z', status: 'diagnosed', title: 'Diagnoza wykonana', description: 'Zidentyfikowano problem z ładowarką MagSafe' },
        { time: '2025-11-29T09:00:00Z', status: 'in_progress', title: 'Rozpoczęto naprawę', description: 'Wymiana uszkodzonego złącza ładowania' },
        { time: '2025-11-30T11:30:00Z', status: 'testing', title: 'Testowanie', description: 'Przeprowadzenie testów po naprawie' },
        { time: '2025-12-02T16:00:00Z', status: 'ready', title: 'Gotowe do odbioru', description: 'Naprawa zakończona, oczekiwanie na odbiór' }
      ],
      photos: [
        '/images/repair/001-before.jpg',
        '/images/repair/001-during.jpg',
        '/images/repair/001-after.jpg'
      ],
      parts: [
        { name: 'MagSafe Connector', price: 89, status: 'ordered' },
        { name: 'Thermal Paste', price: 25, status: 'installed' },
        { name: 'Labor', price: 185, status: 'completed' }
      ]
    },
    {
      id: 'BC-2025-002',
      customerName: 'Tomasz Kowalski',
      device: 'Dell Latitude 7420',
      issue: 'Przegrzewanie się laptopa',
      status: 'diagnosed',
      progress: 25,
      createdAt: '2025-11-30T15:20:00Z',
      estimatedCompletion: '2025-12-05T14:00:00Z',
      technician: 'Anna Wiśniewska',
      price: 179,
      description: 'Czyszczenie układu chłodzenia, wymiana pasty termoprzewodzącej',
      timeline: [
        { time: '2025-11-30T15:20:00Z', status: 'received', title: 'Otrzymano zlecenie', description: 'Urządzenie zostało przyjęte do serwisu' },
        { time: '2025-12-01T09:45:00Z', status: 'diagnosed', title: 'Diagnoza wykonana', description: 'Potwierdzono problem z układem chłodzenia' }
      ],
      photos: [],
      parts: [
        { name: 'Thermal Paste', price: 25, status: 'pending' },
        { name: 'Cleaning Kit', price: 15, status: 'pending' },
        { name: 'Labor', price: 139, status: 'scheduled' }
      ]
    },
    {
      id: 'BC-2025-003',
      customerName: 'Katarzyna Dąbrowska',
      device: 'iPhone 13 Pro',
      issue: 'Wymiana ekranu',
      status: 'completed',
      progress: 100,
      createdAt: '2025-11-25T11:10:00Z',
      estimatedCompletion: '2025-11-28T16:00:00Z',
      technician: 'Piotr Majewski',
      price: 449,
      description: 'Wymiana rozbitgo wyświetlacza z zachowaniem Face ID',
      timeline: [
        { time: '2025-11-25T11:10:00Z', status: 'received', title: 'Otrzymano zlecenie', description: 'Urządzenie zostało przyjęte do serwisu' },
        { time: '2025-11-25T16:30:00Z', status: 'diagnosed', title: 'Diagnoza wykonana', description: 'Potwierdzono uszkodzenie wyświetlacza' },
        { time: '2025-11-26T10:00:00Z', status: 'in_progress', title: 'Rozpoczęto naprawę', description: 'Wymiana wyświetlacza' },
        { time: '2025-11-27T14:20:00Z', status: 'testing', title: 'Testowanie', description: 'Testy funkcjonalności i kalibracja' },
        { time: '2025-11-28T15:45:00Z', status: 'completed', title: 'Naprawa zakończona', description: 'Urządzenie gotowe do odbioru' }
      ],
      photos: [
        '/images/repair/003-before.jpg',
        '/images/repair/003-after.jpg'
      ],
      parts: [
        { name: 'OLED Display', price: 320, status: 'installed' },
        { name: 'Labor', price: 129, status: 'completed' }
      ]
    }
  ];
};

const statusConfig = {
  new_request: { 
    label: 'Nowe zgłoszenie', 
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: Package 
  },
  open: { 
    label: 'Otwarte', 
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    icon: BarChart3 
  },
  waiting_for_parts: { 
    label: 'Oczekiwanie na części', 
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Package 
  },
  in_repair: { 
    label: 'W trakcie naprawy', 
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    icon: Wrench 
  },
  repair_completed: { 
    label: 'Naprawa zakończona', 
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: CheckCircle 
  },
  ready_for_pickup: { 
    label: 'Gotowe do odbioru', 
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Truck 
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getProgressColor = (status) => {
  const colors = {
    new_request: 'bg-blue-500',
    open: 'bg-yellow-500',
    waiting_for_parts: 'bg-amber-500',
    in_repair: 'bg-orange-500',
    repair_completed: 'bg-purple-500',
    ready_for_pickup: 'bg-emerald-500'
  };
  return colors[status] || 'bg-gray-500';
};

const RepairTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendRepairStatusEmail, sendRepairReadyEmail } = useRepairNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [repairs, setRepairs] = useState([]);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Funkcja do pobierania napraw użytkownika z bazy danych
  const fetchUserRepairs = useCallback(async () => {
    if (!user) {
      setRepairs([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('diagnosis_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ variant: 'destructive', title: 'Błąd pobierania napraw', description: error.message });
        setRepairs([]);
      } else {
        // Konwersja danych z bazy do formatu komponentu
        const formattedRepairs = data.map(repair => ({
          id: repair.id,
          customerName: user.email?.split('@')[0] || 'Klient',
          device: repair.device || 'Nieznane urządzenie',
          issue: repair.description || 'Brak opisu',
          status: repair.status || 'received',
          progress: getStatusProgress(repair.status || 'received'),
          createdAt: repair.created_at,
          estimatedCompletion: repair.updated_at || repair.created_at,
          technician: 'ByteClinic',
          price: repair.estimated_price || 0,
          description: repair.description || 'Diagnoza i naprawa',
          timeline: repair.updated_at ? [
            { 
              time: repair.created_at, 
              status: 'received', 
              title: 'Otrzymano zlecenie', 
              description: 'Urządzenie zostało przyjęte do serwisu' 
            },
            { 
              time: repair.updated_at, 
              status: repair.status, 
              title: 'Status zaktualizowany', 
              description: `Status zlecenia: ${getStatusLabel(repair.status)}` 
            }
          ] : [
            { 
              time: repair.created_at, 
              status: 'received', 
              title: 'Otrzymano zlecenie', 
              description: 'Urządzenie zostało przyjęte do serwisu' 
            }
          ],
          photos: [],
          parts: [
            { name: 'Diagnoza', price: 0, status: 'completed' },
            { name: 'Naprawa', price: repair.estimated_price || 0, status: repair.status === 'completed' ? 'completed' : 'pending' }
          ]
        }));
        setRepairs(formattedRepairs);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Błąd', description: 'Nie udało się pobrać danych napraw' });
      setRepairs([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const getStatusLabel = (status) => {
    const statusMap = {
      'new_request': 'Nowe zgłoszenie',
      'open': 'Otwarte',
      'waiting_for_parts': 'Oczekiwanie na części',
      'in_repair': 'W trakcie naprawy',
      'repair_completed': 'Naprawa zakończona',
      'ready_for_pickup': 'Gotowe do odbioru'
    };
    return statusMap[status] || status;
  };

  const getStatusProgress = (status) => {
    const statusOrder = ['new_request', 'open', 'waiting_for_parts', 'in_repair', 'repair_completed', 'ready_for_pickup'];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  // Funkcja pobierająca naprawy przy mount
  useEffect(() => {
    fetchUserRepairs();
  }, [fetchUserRepairs]);

  const filteredRepairs = repairs.filter(repair => 
    repair.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repair.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repair.device.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusProgressValue = (status) => {
    const statusOrder = ['new', 'open', 'in_progress', 'closed'];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const getEstimatedDaysRemaining = (estimatedDate) => {
    const now = new Date();
    const estimated = new Date(estimatedDate);
    const diffTime = estimated.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Opóźnione';
    if (diffDays === 0) return 'Dziś';
    if (diffDays === 1) return '1 dzień';
    return `${diffDays} dni`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300 mb-2">
          🚀 STATUS NAPRAW
        </h2>
        <p className="text-muted-foreground">
          Śledź postęp swoich napraw w czasie rzeczywistym
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Wyszukaj po numerze zlecenia, nazwie klienta lub urządzeniu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              📊 Statystyki
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Repair List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Ładowanie napraw...</p>
            </CardContent>
          </Card>
        ) : filteredRepairs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak napraw'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Spróbuj zmienić kryteria wyszukiwania' 
                  : 'Nie masz jeszcze żadnych napraw w systemie'
                }
              </p>
              {searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Wyczyść wyszukiwanie
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild>
                    <Link to="/kontakt">📝 Złóż zgłoszenie</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/panel">📊 Przejdź do panelu</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredRepairs.map((repair) => {
              const StatusIcon = statusConfig[repair.status]?.icon || Package;
              const progressPercent = getStatusProgressValue(repair.status);
              
              return (
                <motion.div
                  key={repair.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedRepair(repair)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-mono text-lg text-primary">#{repair.id.substring(0, 8)}</h3>
                          <p className="font-semibold">{repair.customerName}</p>
                          <p className="text-sm text-muted-foreground">{repair.device}</p>
                          <p className="text-xs text-muted-foreground mt-1">{repair.issue}</p>
                        </div>
                        
                        <div className="text-right space-y-2">
                          <Badge className={statusConfig[repair.status]?.color || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[repair.status]?.label || repair.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            Pozostało: {getEstimatedDaysRemaining(repair.estimatedCompletion)}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Postęp naprawy</span>
                          <span className="font-mono">{progressPercent}%</span>
                        </div>
                        <div className="relative">
                          <Progress value={progressPercent} className="h-2" />
                          <div 
                            className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${
                              repair.status === 'closed' ? 'bg-green-500' :
                              repair.status === 'in_progress' ? 'bg-orange-500' :
                              repair.status === 'open' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Info */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>👨‍🔧 {repair.technician}</span>
                          <span>💰 {repair.price} PLN</span>
                        </div>
                        <span>📅 {formatDate(repair.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRepair(repair);
                        }}>
                          📋 Szczegóły
                        </Button>
                        <Button variant="outline" size="sm">
                          📞 Kontakt
                        </Button>
                        {repair.photos.length > 0 && (
                          <Button variant="outline" size="sm">
                            📷 Zdjęcia
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedRepair} onOpenChange={() => setSelectedRepair(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRepair && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Szczegóły naprawy #{selectedRepair.id}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Przegląd</TabsTrigger>
                  <TabsTrigger value="timeline">Oś czasu</TabsTrigger>
                  <TabsTrigger value="photos">Zdjęcia</TabsTrigger>
                  <TabsTrigger value="parts">Części</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Informacje podstawowe</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Numer zlecenia:</strong> #{selectedRepair.id.substring(0, 8)}</p>
                        <p><strong>Urządzenie:</strong> {selectedRepair.device}</p>
                        <p><strong>Problem:</strong> {selectedRepair.issue}</p>
                        <p><strong>Technik:</strong> {selectedRepair.technician}</p>
                        <p><strong>Szacowana cena:</strong> {selectedRepair.price} PLN</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Status i czas</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Status:</strong> 
                          <Badge className={`ml-2 ${statusConfig[selectedRepair.status]?.color || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[selectedRepair.status]?.label || selectedRepair.status}
                          </Badge>
                        </p>
                        <p><strong>Data przyjęcia:</strong> {formatDate(selectedRepair.createdAt)}</p>
                        <p><strong>Ostatnia aktualizacja:</strong> {formatDate(selectedRepair.estimatedCompletion)}</p>
                        <p><strong>Postęp:</strong> {getStatusProgressValue(selectedRepair.status)}%</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Opis naprawy</h4>
                    <p className="text-sm text-muted-foreground">{selectedRepair.description}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button>
                      <Phone className="w-4 h-4 mr-2" />
                      Zadzwoń
                    </Button>
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/panel/zgloszenia/{selectedRepair.id}">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Szczegóły w panelu
                      </Link>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <div className="space-y-4">
                    {selectedRepair.timeline.map((event, index) => {
                      const EventIcon = statusConfig[event.status]?.icon || Clock;
                      
                      return (
                        <div key={index} className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <EventIcon className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{event.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {formatDate(event.time)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="photos" className="space-y-4">
                  {selectedRepair.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedRepair.photos.map((photo, index) => (
                        <div key={index} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                          <span className="sr-only">Zdjęcie {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Brak zdjęć dostępnych dla tej naprawy</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="parts" className="space-y-4">
                  <div className="space-y-3">
                    {selectedRepair.parts.map((part, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">{part.name}</h4>
                          <p className="text-sm text-muted-foreground">{part.price} PLN</p>
                        </div>
                        <Badge variant={
                          part.status === 'installed' || part.status === 'completed' ? 'default' :
                          part.status === 'ordered' ? 'secondary' : 'outline'
                        }>
                          {part.status === 'installed' ? 'Zainstalowane' :
                           part.status === 'ordered' ? 'Zamówione' :
                           part.status === 'completed' ? 'Zakończone' : 'Oczekuje'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {filteredRepairs.length === 0 && searchQuery && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nie znaleziono wyników</h3>
            <p className="text-muted-foreground mb-4">
              Spróbuj wyszukać po numerze zlecenia, nazwie klienta lub urządzeniu
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Wyczyść wyszukiwanie
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RepairTracker;