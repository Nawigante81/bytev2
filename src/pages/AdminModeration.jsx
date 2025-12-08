
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Trash2, MessageSquare, Ticket, MessageCircle } from 'lucide-react';
import SectionTitle from '@/components/SectionTitle';
import PageTransition from '@/components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';

const ReviewsTab = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, title, message, user_id, status, approved, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error);
        toast({ variant: 'destructive', title: 'Błąd pobierania opinii', description: error.message });
        setReviews([]);
      } else {
        // Mapuj dane i dodaj fallback dla profili
        const reviewsWithProfiles = data.map(review => ({
          ...review,
          profiles: {
            full_name: review.user_id ? `User ${review.user_id.substring(0, 8)}` : 'Anonim'
          }
        }));
        setReviews(reviewsWithProfiles);
      }
    } catch (err) {
      console.error("Exception fetching reviews:", err);
      setReviews([]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleReviewStatus = async (reviewId, newStatus) => {
    const { error } = await supabase
      .from('reviews')
      .update({ status: newStatus, approved: newStatus === 'approved' })
      .eq('id', reviewId);

    if (error) {
      toast({ variant: 'destructive', title: 'Błąd moderacji', description: error.message });
    } else {
      toast({ title: `Status opinii zmieniony!` });
      fetchReviews();
    }
  };

  const handleReviewDelete = async (reviewId) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      toast({ variant: 'destructive', title: 'Błąd usuwania opinii', description: error.message });
    } else {
      toast({ title: 'Opinia została usunięta.' });
      fetchReviews();
    }
  };
  
  const getStatusConfig = (status, approved) => {
    if (approved) return { label: 'Zatwierdzona', className: 'bg-green-500/20 text-green-300' };
    switch (status) {
      case 'rejected':
        return { label: 'Odrzucona', className: 'bg-red-500/20 text-red-300' };
      case 'pending':
      default:
        return { label: 'Oczekuje', className: 'bg-yellow-500/20 text-yellow-300' };
    }
  };

  const ReviewItem = ({ review }) => {
    const statusConfig = getStatusConfig(review.status, review.approved);
    
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border/50 hover:bg-muted/50">
        <div className="flex-grow">
          <p className="font-bold">{review.title}</p>
          <p className="text-sm text-muted-foreground">{review.profiles?.full_name || 'Anonim'} - {new Date(review.created_at).toLocaleDateString()}</p>
          <p className="text-sm mt-1">{review.message}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
          <span className={cn("px-2 py-1 text-xs rounded-full w-full sm:w-auto text-center", statusConfig.className)}>
            {statusConfig.label}
          </span>
          {!review.approved && (
            <Button size="sm" variant="outline" className="h-8 border-green-500 text-green-500 hover:bg-green-500 hover:text-white w-full sm:w-auto" onClick={() => handleReviewStatus(review.id, 'approved')}>
              <Check className="h-4 w-4" /> <span className="sm:hidden ml-2">Zatwierdź</span>
            </Button>
          )}
           {review.status !== 'rejected' && (
            <Button size="sm" variant="outline" className="h-8 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white w-full sm:w-auto" onClick={() => handleReviewStatus(review.id, 'rejected')}>
              <X className="h-4 w-4" /> <span className="sm:hidden ml-2">Odrzuć</span>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 border-destructive text-destructive hover:bg-destructive hover:text-white w-full sm:w-auto">
                <Trash2 className="h-4 w-4" /> <span className="sm:hidden ml-2">Usuń</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Czy na pewno chcesz usunąć tę opinię?</AlertDialogTitle><AlertDialogDescription>Tej operacji nie można cofnąć. Opinia zostanie trwale usunięta.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={() => handleReviewDelete(review.id)}>Usuń</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return reviews.length > 0 ? (
    <div className="space-y-2">
      {reviews.map(review => <ReviewItem key={review.id} review={review} />)}
    </div>
  ) : <p className="text-center text-muted-foreground p-8">Brak opinii do moderacji.</p>;
};

const TicketsTab = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_desc');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('requests')
        .select('id, request_id, type, customer_name, customer_email, device_type, device_model, message, status, priority, created_at, updated_at');

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      // sorting
      if (sortBy === 'created_asc') query = query.order('created_at', { ascending: true });
      else if (sortBy === 'created_desc') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'device_asc') query = query.order('device_type', { ascending: true, nullsFirst: true });
      else if (sortBy === 'device_desc') query = query.order('device_type', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tickets:", error);
        toast({ variant: 'destructive', title: 'Błąd pobierania zgłoszeń', description: error.message });
        setTickets([]);
      } else {
        setTickets(data || []);
      }
    } catch (err) {
      console.error("Exception fetching tickets:", err);
      setTickets([]);
    }
    setLoading(false);
  }, [toast, statusFilter, sortBy]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(tickets.map(t => t.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase.from('requests').delete().in('id', ids);
      if (error) {
        toast({ variant: 'destructive', title: 'Błąd usuwania', description: error.message });
      } else {
        toast({ title: `Usunięto ${ids.length} zgłoszeń.` });
        clearSelection();
        fetchTickets();
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Błąd usuwania', description: 'Tabela requests może nie istnieć' });
    }
  };
  
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      nowe: { label: 'Nowe', className: 'bg-blue-500/20 text-blue-300' },
      otwarte: { label: 'Otwarte', className: 'bg-cyan-500/20 text-cyan-300' },
      w_realizacji: { label: 'W realizacji', className: 'bg-yellow-500/20 text-yellow-300' },
      zakonczone: { label: 'Zakończone', className: 'bg-zinc-500/20 text-zinc-300' },
      default: { label: status, className: 'bg-gray-500/20 text-gray-300' },
    };
    const config = statusConfig[status] || statusConfig.default;
    return <span className={cn("px-2 py-1 text-xs font-mono uppercase rounded-full", config.className)}>{config.label}</span>;
  };

  const deleteTicket = async (id) => {
    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);
      if (error) {
        toast({ variant: 'destructive', title: 'Błąd usuwania zgłoszenia', description: error.message });
      } else {
        toast({ title: 'Zgłoszenie zostało usunięte.' });
        fetchTickets();
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Błąd usuwania zgłoszenia', description: 'Tabela requests może nie istnieć' });
    }
  };

  const TicketItem = ({ ticket }) => (
    <div className="p-4 border-b border-border/50 hover:bg-muted/50">
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-2 sm:items-center">
        <div className="flex items-start gap-3 flex-1">
          <input type="checkbox" aria-label={`Zaznacz zgłoszenie ${ticket.id}`} className="mt-1 h-4 w-4" checked={selectedIds.has(ticket.id)} onChange={() => toggleSelect(ticket.id)} />
          <Link to={`/panel/zgloszenia/${ticket.id}`} className="flex-grow focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded">
            <p className="font-bold">{ticket.device_type || 'Brak tytułu'}</p>
            <p className="text-sm text-muted-foreground">{ticket.customer_name} - {new Date(ticket.created_at).toLocaleDateString()}</p>
          </Link>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <StatusBadge status={ticket.status} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 border-destructive text-destructive hover:bg-destructive hover:text-white">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Czy usunąć to zgłoszenie?</AlertDialogTitle>
                <AlertDialogDescription>Tej operacji nie można cofnąć. Zgłoszenie zostanie trwale usunięte.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteTicket(ticket.id)}>Usuń</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[160px] text-sm">
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Wszystkie</SelectItem>
              <SelectItem value="nowe">Nowe</SelectItem>
              <SelectItem value="otwarte">Otwarte</SelectItem>
              <SelectItem value="w_realizacji">W realizacji</SelectItem>
              <SelectItem value="zakonczone">Zakończone</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sortuj:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-[200px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Najnowsze najpierw</SelectItem>
              <SelectItem value="created_asc">Najstarsze najpierw</SelectItem>
              <SelectItem value="device_asc">Typ urządzenia A→Z</SelectItem>
              <SelectItem value="device_desc">Typ urządzenia Z→A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => selectAll()}>Zaznacz wszystko</Button>
          <Button variant="outline" size="sm" onClick={() => clearSelection()}>Wyczyść zaznaczenie</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={selectedIds.size === 0}>Usuń zaznaczone ({selectedIds.size})</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć zaznaczone zgłoszenia?</AlertDialogTitle>
                <AlertDialogDescription>Tej operacji nie można cofnąć. Usunięte zgłoszenia nie będą widoczne w systemie.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={bulkDelete}>Usuń</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {tickets.length > 0 ? (
        <div className="space-y-2">
          {tickets.map(ticket => <TicketItem key={ticket.id} ticket={ticket} />)}
        </div>
      ) : (
        <p className="text-center text-muted-foreground p-8">Brak zgłoszeń serwisowych.</p>
      )}
    </div>
  );
};


const CommentsTab = () => {
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchComments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('ticket_comments')
      .select('id, ticket_id, author_id, body, created_at, diagnosis_requests(id, device)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast({ variant: 'destructive', title: 'Błąd pobierania komentarzy', description: error.message });
      setComments([]);
      setLoading(false);
      return;
    }

    const base = data || [];
    const authorIds = Array.from(new Set(base.map((c) => c.author_id).filter(Boolean)));
    let profilesMap = new Map();
    if (authorIds.length > 0) {
      const { data: profs, error: perr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);
      if (!perr && Array.isArray(profs)) {
        profilesMap = new Map(profs.map((p) => [p.id, p.full_name]));
      }
    }

    const enriched = base.map((c) => ({
      ...c,
      author: profilesMap.get(c.author_id) || 'Anonim',
    }));

    setComments(enriched);
    setLoading(false);
  }, [toast, statusFilter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const deleteComment = async (id) => {
    const { error } = await supabase.from('ticket_comments').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Błąd usuwania komentarza', description: error.message });
    } else {
      toast({ title: 'Komentarz usunięty' });
      fetchComments();
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Komentarze do zgłoszeń</span>
      </div>

      {comments.length === 0 ? (
        <p className="text-center text-muted-foreground p-8">Brak komentarzy.</p>
      ) : (
        <div className="divide-y divide-border/50">
          {comments.map((c) => (
            <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">
                  #{String(c.id)} • Autor: {c.author} • Zgłoszenie: <Link to={`/panel/zgloszenia/${c.ticket_id}`} className="underline hover:text-primary">{c.diagnosis_requests?.device || c.ticket_id}</Link> • {new Date(c.created_at).toLocaleString('pl-PL')}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{c.body}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 border-destructive text-destructive hover:bg-destructive hover:text-white">Usuń</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Usunąć komentarz?</AlertDialogTitle>
                      <AlertDialogDescription>Tej operacji nie można cofnąć.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteComment(c.id)}>Usuń</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminModeration = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Moderacja - Panel Admina - ByteClinic</title>
      </Helmet>
      <SectionTitle subtitle="Zarządzaj opiniami i zgłoszeniami">Panel Moderacji</SectionTitle>
      
      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reviews"><MessageSquare className="w-4 h-4 mr-2" />Opinie</TabsTrigger>
          <TabsTrigger value="tickets"><Ticket className="w-4 h-4 mr-2" />Zgłoszenia</TabsTrigger>
          <TabsTrigger value="comments"><MessageCircle className="w-4 h-4 mr-2" />Komentarze</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews">
          <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Opinie do moderacji</CardTitle>
              <CardDescription>Zatwierdzaj, odrzucaj lub usuwaj opinie użytkowników.</CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewsTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tickets">
          <Card className="bg-card/80 border-secondary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Zgłoszenia serwisowe</CardTitle>
              <CardDescription>Przeglądaj wszystkie zgłoszenia serwisowe od użytkowników.</CardDescription>
            </CardHeader>
            <CardContent>
              <TicketsTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comments">
          <Card className="bg-card/80 border-secondary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Komentarze do zgłoszeń</CardTitle>
              <CardDescription>Moderuj komentarze: zmieniaj status, usuwaj niewłaściwe treści.</CardDescription>
            </CardHeader>
            <CardContent>
              <CommentsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
};

export default AdminModeration;
