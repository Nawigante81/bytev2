
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Helper function to safely render Polish text
    const safeText = (text) => {
      return text
        .replace(/ą/g, 'a').replace(/Ą/g, 'A')
        .replace(/ć/g, 'c').replace(/Ć/g, 'C')
        .replace(/ę/g, 'e').replace(/Ę/g, 'E')
        .replace(/ł/g, 'l').replace(/Ł/g, 'L')
        .replace(/ń/g, 'n').replace(/Ń/g, 'N')
        .replace(/ó/g, 'o').replace(/Ó/g, 'O')
        .replace(/ś/g, 's').replace(/Ś/g, 'S')
        .replace(/ź/g, 'z').replace(/Ź/g, 'Z')
        .replace(/ż/g, 'z').replace(/Ż/g, 'Z');
    };

    // Helper function to add page footer
    const addFooter = (pageNum) => {
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        safeText(`ByteClinic © ${new Date().getFullYear()} | Strona ${pageNum}`),
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        safeText(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`),
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - 30) {
        addFooter(doc.internal.getNumberOfPages());
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Header with logo placeholder and title
    doc.setFillColor(37, 99, 235); // Primary blue color
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('Helvetica', 'bold');
    doc.text('ByteClinic', margin, 20);
    
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'normal');
    doc.text('Zgloszenie Serwisowe', margin, 30);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 60;

    // Ticket ID and Status Box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(safeText(`ID Zgloszenia: ${displayId || ticket.id}`), margin + 5, yPos + 10);
    
    // Status badge
    const statusLabel = getStatusDetails(ticket.status).label;
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    
    // Status color based on status
    let statusColor = [128, 128, 128];
    if (ticket.status === 'new_request') statusColor = [59, 130, 246];
    else if (ticket.status === 'in_repair') statusColor = [249, 115, 22];
    else if (ticket.status === 'repair_completed' || ticket.status === 'ready_for_pickup') statusColor = [34, 197, 94];
    
    doc.setFillColor(...statusColor);
    doc.roundedRect(margin + 5, yPos + 15, 50, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabel.toUpperCase(), margin + 30, yPos + 20.5, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos += 45;

    // Main Information Section
    checkNewPage(40);
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Informacje Podstawowe', margin, yPos);
    
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 2, margin + 60, yPos + 2);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const infoData = [
      ['Urzadzenie:', deviceLabel],
      ['Klient:', customerLabel],
      ['Data utworzenia:', new Date(ticket.created_at).toLocaleString('pl-PL')],
      ['Status:', statusLabel],
    ];

    if (estimatedCompletion?.date) {
      infoData.push(['Szacowane zakonczenie:',
        `${estimatedCompletion.date.toLocaleDateString('pl-PL')} (${safeText(estimatedCompletion.description)})`
      ]);
    } else if (estimatedCompletion?.description) {
      infoData.push(['Status realizacji:', safeText(estimatedCompletion.description)]);
    }

    infoData.forEach(([label, value]) => {
      checkNewPage(8);
      doc.setFont('Helvetica', 'bold');
      doc.text(safeText(label), margin, yPos);
      doc.setFont('Helvetica', 'normal');
      const valueLines = doc.splitTextToSize(safeText(value), contentWidth - 60);
      doc.text(valueLines, margin + 60, yPos);
      yPos += Math.max(8, valueLines.length * 5);
    });

    yPos += 5;

    // Description Section
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Opis Problemu', margin, yPos);
    
    doc.setDrawColor(37, 99, 235);
    doc.line(margin, yPos + 2, margin + 45, yPos + 2);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const descriptionText = ticket.message || 'Brak opisu problemu.';
    const descriptionLines = doc.splitTextToSize(safeText(descriptionText), contentWidth);
    
    descriptionLines.forEach(line => {
      checkNewPage(6);
      doc.text(line, margin, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Timeline Section
    if (timeline && timeline.length > 0) {
      checkNewPage(30);
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Historia Naprawy', margin, yPos);
      
      doc.setDrawColor(37, 99, 235);
      doc.line(margin, yPos + 2, margin + 50, yPos + 2);
      yPos += 10;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      timeline.forEach((event, index) => {
        checkNewPage(25);
        
        // Event box
        doc.setFillColor(250, 250, 250);
        const boxHeight = 20;
        doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'F');
        
        // Event icon/number
        doc.setFillColor(37, 99, 235);
        doc.circle(margin + 5, yPos + 10, 3, 'F');
        
        // Event details
        doc.setFont('Helvetica', 'bold');
        doc.text(safeText(`${index + 1}. ${event.title}`), margin + 12, yPos + 8);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(new Date(event.created_at).toLocaleString('pl-PL'), margin + 12, yPos + 13);
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const eventDesc = doc.splitTextToSize(safeText(event.description), contentWidth - 20);
        doc.text(eventDesc, margin + 12, yPos + 18);
        
        yPos += boxHeight + 5;
      });
    }

    yPos += 10;

    // Contact and Warranty Section (side by side if space allows)
    checkNewPage(50);
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Kontakt', margin, yPos);
    doc.text('Gwarancja', pageWidth / 2 + 10, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Contact info
    doc.text('Tel: +48 724 316 523', margin, yPos);
    doc.text('Email: kontakt@byteclinic.pl', margin, yPos + 5);
    doc.text('Pon-Pt: 9:00-17:00', margin, yPos + 10);
    
    // Warranty info
    doc.text('Na prace: 3 miesiace', pageWidth / 2 + 10, yPos);
    doc.text('Na czesci: 12 miesiecy', pageWidth / 2 + 10, yPos + 5);
    doc.text('Status: Aktywna', pageWidth / 2 + 10, yPos + 10);

    // Add footer to last page
    addFooter(doc.internal.getNumberOfPages());

    // Save the PDF
    const fileName = `ByteClinic_Zgloszenie_${(displayId || ticket.id).toString().substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({
      title: 'PDF wygenerowany pomyslnie!',
      description: `Zapisano jako: ${fileName}`
    });
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
                  {profile?.role === 'admin' && (
                    <Button variant="secondary">
                      <Bell className="mr-2 h-4 w-4" /> Powiadom o zmianach
                    </Button>
                  )}
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
