
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  AlertTriangle, ArrowLeft, Copy, FileDown, Loader2, 
  Clock, CheckCircle, Wrench, User, MessageSquare,
  Phone, Mail, Camera, Download, Calendar, Target,
  Zap, Settings, Award, Bell
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_DETAILS = {
  new_request: {
    label: 'Nowe zgłoszenie',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: AlertTriangle,
    progressDescription: 'Zgłoszenie otrzymane',
  },
  open: {
    label: 'Analiza',
    badgeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    icon: Clock,
    progressDescription: 'Diagnoza w toku',
  },
  waiting_for_parts: {
    label: 'Oczekiwanie na części',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    icon: Loader2,
    progressDescription: 'Czekamy na dostawę części',
  },
  in_repair: {
    label: 'W naprawie',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    icon: Wrench,
    progressDescription: 'Trwają prace serwisowe',
  },
  repair_completed: {
    label: 'Naprawa zakończona',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle,
    progressDescription: 'Weryfikacja jakości',
  },
  ready_for_pickup: {
    label: 'Gotowe do odbioru',
    badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30',
    icon: Award,
    progressDescription: 'Czeka na odbiór',
  },
};

const STATUS_SEQUENCE = [
  'new_request',
  'open',
  'waiting_for_parts',
  'in_repair',
  'repair_completed',
  'ready_for_pickup',
];

const getStatusDetails = (status) => STATUS_DETAILS[status] || {
  label: status || 'Nieznany status',
  badgeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  icon: Clock,
  progressDescription: 'Aktualizacja w toku',
};

const StatusBadge = ({ status }) => {
  const config = getStatusDetails(status);
  const IconComponent = config.icon || Clock;
  return (
    <Badge variant="outline" className={cn('font-mono uppercase flex items-center gap-1', config.badgeClass)}>
      <IconComponent className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

const ProgressTracker = ({ status }) => {
  const steps = STATUS_SEQUENCE.map((key) => ({
    key,
    label: getStatusDetails(key).label,
    description: getStatusDetails(key).progressDescription,
  }));

  const currentIndex = steps.findIndex(step => step.key === status);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Postęp naprawy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full bg-muted/50 rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {steps.map((step, index) => (
            <div 
              key={step.key}
              className={cn(
                "text-center p-2 rounded-lg text-xs",
                index <= currentIndex 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "bg-muted/50 text-muted-foreground border border-border/50"
              )}
            >
              <div className="font-semibold">{step.label}</div>
              <div className="text-xs mt-1">{step.description}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Etap: {steps[currentIndex]?.label || 'Nieokreślony'} ({Math.round(progress)}%)
        </div>
      </CardContent>
    </Card>
  );
};

const TimelineEvent = ({ event, isLast }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'status_change': return CheckCircle;
      case 'note': return MessageSquare;
      case 'photo': return Camera;
      case 'diagnosis': return Wrench;
      case 'completion': return Award;
      default: return Clock;
    }
  };

  const IconComponent = getIcon(event.type);
  const photos = Array.isArray(event.photos)
    ? event.photos.map((photo) => {
        if (typeof photo === 'string') return { url: photo };
        if (photo && typeof photo === 'object' && photo.url) return photo;
        return null;
      }).filter(Boolean)
    : [];

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-10 h-10 rounded-full border-2 flex items-center justify-center",
          event.type === 'status_change' ? "bg-green-500/20 border-green-500/30 text-green-400" :
          event.type === 'note' ? "bg-blue-500/20 border-blue-500/30 text-blue-400" :
          event.type === 'photo' ? "bg-purple-500/20 border-purple-500/30 text-purple-400" :
          "bg-gray-500/20 border-gray-500/30 text-gray-400"
        )}>
          <IconComponent className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-px h-16 bg-border mt-2"></div>}
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold">{event.title}</h4>
          <span className="text-xs text-muted-foreground">
            {new Date(event.created_at).toLocaleString('pl-PL')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
        {event.metadata && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {event.metadata}
          </div>
        )}
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2">
            {photos.map((photo, index) => (
              <img 
                key={index} 
                src={photo.url} 
                alt={`Zdjęcie ${index + 1}`}
                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                onClick={() => window.open(photo.url, '_blank')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SkeletonTicket = () => (
  <div className="max-w-6xl mx-auto">
    <Skeleton className="h-8 w-48 mb-4" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const EmptyState = ({ title, description, onBack }) => (
  <div className="text-center py-20 max-w-md mx-auto">
    <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
    <h1 className="text-2xl font-mono text-destructive">{title}</h1>
    <p className="mt-2 text-muted-foreground">{description}</p>
    <Button onClick={onBack} variant="outline" className="mt-6">
      <ArrowLeft className="mr-2 h-4 w-4" /> Wróć do listy
    </Button>
  </div>
);

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [estimatedCompletion, setEstimatedCompletion] = useState(null);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('diagnosis_requests:', fetchError);
      if (fetchError.code === 'PGRST116') {
        setError('Nie znaleziono zgłoszenia lub nie masz do niego dostępu.');
      } else {
        setError('Wystąpił błąd podczas pobierania danych zgłoszenia.');
      }
    } else {
      setTicket(data);
      // Ustaw szacowany czas zakończenia na podstawie statusu
      const completionMap = {
        new_request: { days: 2, description: '2-3 dni robocze' },
        open: { days: 2, description: '2-3 dni robocze' },
        waiting_for_parts: { days: 5, description: 'Zależne od dostawcy' },
        in_repair: { days: 2, description: '1-2 dni robocze' },
        repair_completed: { days: 0, description: 'Naprawa zakończona' },
        ready_for_pickup: { days: 0, description: 'Gotowe do odbioru' }
      };
      const completion = completionMap[data.status] || { days: 3, description: '3-4 dni robocze' };
      
      if (completion.days > 0) {
        const eta = new Date();
        eta.setDate(eta.getDate() + completion.days);
        setEstimatedCompletion({
          date: eta,
          description: completion.description
        });
      } else {
        setEstimatedCompletion({
          date: null,
          description: completion.description
        });
      }
    }
    setLoading(false);
  }, [id]);

  const fetchTimeline = useCallback(async () => {
    if (!id) return;

    const { data: repair, error: repairError } = await supabase
      .from('repairs')
      .select('id')
      .eq('request_id', id)
      .maybeSingle();

    if (repairError) {
      console.error('repairs:', repairError);
      return;
    }

    if (!repair) {
      setTimeline([]);
      return;
    }

    const { data, error } = await supabase
      .from('repair_timeline')
      .select('id, status, title, description, technician_name, estimated_completion, price_change, notes, photos, created_at')
      .eq('repair_id', repair.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('repair_timeline:', error);
      return;
    }

    const normalizedEvents = (data || []).map((event) => {
      const metadataParts = [];
      if (event.technician_name) metadataParts.push(`Technik: ${event.technician_name}`);
      if (event.estimated_completion) metadataParts.push(`ETA: ${new Date(event.estimated_completion).toLocaleString('pl-PL')}`);
      if (event.notes) metadataParts.push(event.notes);

      return {
        ...event,
        type: 'status_change',
        title: event.title || getStatusDetails(event.status).label,
        description: event.description || `Status: ${getStatusDetails(event.status).label}`,
        metadata: metadataParts.join(' • ') || null,
      };
    });

    setTimeline(normalizedEvents);
  }, [id]);


  useEffect(() => {
    fetchTicket();
    fetchTimeline();
  }, [fetchTicket, fetchTimeline]);

  // Auto-refresh co 30 sekund dla statusu na żywo
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTicket();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchTicket]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Skopiowano do schowka!' });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.text('ByteClinic - Zgłoszenie serwisowe', 14, 22);
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'normal');
    doc.text(`ID Zgłoszenia: ${displayId || ticket.id}`, 14, 32);
    doc.text(`Status: ${ticket.status}`, 14, 42);
    doc.text(`Data utworzenia: ${new Date(ticket.created_at).toLocaleString('pl-PL')}`, 14, 52);
    doc.text(`Tytuł: ${ticket.device || 'Brak'}`, 14, 62);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Opis problemu:', 14, 72);
    doc.setFont('Helvetica', 'normal');
    const splitContent = doc.splitTextToSize(ticket.message || 'Brak opisu.', 180);
    doc.text(splitContent, 14, 82);

    doc.save(`ticket_${(displayId || ticket.id).toString().substring(0, 8)}.pdf`);
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    const { data, error: updateError } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', ticket.id)
      .select()
      .single();

    if (updateError) {
      toast({ variant: 'destructive', title: 'Błąd aktualizacji statusu', description: updateError.message });
    } else {
      setTicket(data);
      toast({ title: 'Status zaktualizowany!' });
      fetchTicket(); // Odśwież dane
      fetchTimeline();
    }
    setIsUpdating(false);
  };

  if (loading) {
    return <SkeletonTicket />;
  }

  if (error) {
    return <EmptyState title="Błąd 404" description={error} onBack={() => navigate('/panel')} />;
  }

  const displayId = ticket.request_id || ticket.id;
  const breadcrumbLabel = displayId
    ? displayId.toString().substring(0, 8)
    : (ticket.id ? ticket.id.substring(0, 8) : '—');
  const deviceLabel = ticket.device || ticket.device_model || ticket.device_type || 'Brak tytułu';
  const customerLabel = ticket.customer_name || ticket.name || ticket.customer_email || 'Nieokreślone';

  return (
    <PageTransition>
      <Helmet>
        <title>Zgłoszenie {displayId ? `#${displayId}` : `#${id.substring(0, 8)}`} - ByteClinic</title>
      </Helmet>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground font-mono">
            <Link to="/panel" className="hover:text-primary">Panel</Link> / 
            <span className="text-foreground"> Zgłoszenie #{breadcrumbLabel}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Główna treść */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informacje o zgłoszeniu */}
            <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                  <div className="flex-grow">
                    <CardTitle className="text-2xl md:text-3xl break-words">
                      {deviceLabel}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Klient: {customerLabel}
                    </CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Tracker */}
                <ProgressTracker status={ticket.status} />

                {/* Szczegóły */}
                <div className="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground font-mono">ID Zgłoszenia</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-primary break-all">{displayId || ticket.id}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(displayId || ticket.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-mono">Utworzono</p>
                    <p>{new Date(ticket.created_at).toLocaleString('pl-PL')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-mono">Szacowane zakończenie</p>
                    {estimatedCompletion?.date ? (
                      <div>
                        <p>{estimatedCompletion.date.toLocaleDateString('pl-PL')}</p>
                        <p className="text-xs text-muted-foreground">{estimatedCompletion.description}</p>
                      </div>
                    ) : (
                      <p className="text-green-400 font-semibold">{estimatedCompletion?.description}</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground font-mono mb-2">Opis problemu</p>
                  <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-md">{ticket.message || 'Brak opisu.'}</p>
                </div>

                <div className="border-t border-border pt-6 flex flex-wrap gap-4">
                  <Button onClick={() => navigate('/panel')} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Wróć do listy
                  </Button>
                  <Button onClick={exportToPDF} variant="secondary">
                    <FileDown className="mr-2 h-4 w-4" /> Eksportuj do PDF
                  </Button>
                  <Button variant="secondary">
                    <Bell className="mr-2 h-4 w-4" /> Powiadom o zmianach
                  </Button>
                  {profile?.role === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button disabled={isUpdating}>
                          {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Zmień status'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {STATUS_SEQUENCE.map((statusKey) => (
                          <DropdownMenuItem key={statusKey} onClick={() => handleStatusChange(statusKey)}>
                            {getStatusDetails(statusKey).label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline naprawy */}
            <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Historia naprawy
                </CardTitle>
                <CardDescription>
                  Śledź postępy swojej naprawy w czasie rzeczywistym
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timeline.length > 0 ? (
                  <div className="space-y-0">
                    {timeline.map((event, index) => (
                      <TimelineEvent 
                        key={event.id} 
                        event={event} 
                        isLast={index === timeline.length - 1}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Historia naprawy będzie dostępna wkrótce.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel boczny */}
          <div className="space-y-6">
            {/* Kontakt */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Kontakt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-semibold">+48 724 316 523</p>
                    <p className="text-xs text-muted-foreground">Pon-Pt: 9:00-17:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-semibold">kontakt@byteclinic.pl</p>
                    <p className="text-xs text-muted-foreground">Odpowiedź w 24h</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Wyślij wiadomość
                </Button>
              </CardContent>
            </Card>

            {/* Informacje o gwarancji */}
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <Award className="w-5 h-5" />
                  Gwarancja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Na pracę:</span>
                    <span className="font-semibold">3 miesiące</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Na części:</span>
                    <span className="font-semibold">12 miesięcy</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status gwarancji:</span>
                    <span className="text-green-400 font-semibold">Aktywna</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Podsumowanie kosztów */}
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Target className="w-5 h-5" />
                  Koszty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="costs">
                    <AccordionTrigger className="text-sm">Szczegółowe koszty</AccordionTrigger>
                    <AccordionContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Diagnoza:</span>
                        <span>99 PLN</span>
                      </div>
                      {ticket.status === 'closed' && (
                        <>
                          <div className="flex justify-between">
                            <span>Naprawa:</span>
                            <span>149 PLN</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-2">
                            <span>Razem:</span>
                            <span>248 PLN</span>
                          </div>
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default TicketDetails;
