
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Star, Bell, CheckCircle, Clock } from 'lucide-react';
import SectionTitle from '@/components/SectionTitle';
import PageTransition from '@/components/PageTransition';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    nowe: { label: 'Nowe', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    otwarte: { label: 'Otwarte', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    w_realizacji: { label: 'W realizacji', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    zakonczone: { label: 'Zakończone', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
    default: { label: status, className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  };
  const config = statusConfig[status] || statusConfig.default;
  return <Badge variant="outline" className={cn('font-mono uppercase', config.className)}>{config.label}</Badge>;
};

const CustomerPanel = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState({ rating: 0, title: '', message: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [filter, setFilter] = useState('all');
  const [myFiles, setMyFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    let query = supabase
      .from('requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      if (filter === 'open') {
        query = query.in('status', ['nowe', 'otwarte']);
      } else {
        query = query.eq('status', filter);
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({ variant: 'destructive', title: 'Błąd pobierania zgłoszeń', description: error.message });
      setTickets([]);
    } else {
      setTickets(data);
    }
    setLoading(false);
  }, [user, toast, filter]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('requests').select('status').eq('user_id', user.id);
    if (error) return;
    
    const newStats = { total: data.length, open: 0, in_progress: 0, closed: 0 };
    data.forEach(t => {
      if (t.status === 'nowe' || t.status === 'otwarte') newStats.open++;
      if (t.status === 'w_realizacji') newStats.in_progress++;
      if (t.status === 'zakonczone') newStats.closed++;
    });
    setStats(newStats);
  }, [user]);

  const fetchMyFiles = useCallback(async () => {
    if (!user) return;
    setFilesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) {
        setMyFiles(data || []);
      } else {
        // Tabela user_files może nie istnieć - ustaw pustą listę
        setMyFiles([]);
      }
    } catch (err) {
      console.warn('Tabela user_files nie istnieje:', err);
      setMyFiles([]);
    }
    setFilesLoading(false);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_email', user.email)  // ✅ NAPRAWIONE: użyj recipient_email zamiast user_id
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setNotifications(data);
      } else {
        // Tabela notifications może nie istnieć - ustaw pustą listę
        setNotifications([]);
      }
    } catch (err) {
      console.warn('Tabela notifications nie istnieje:', err);
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchTickets();
        fetchStats();
        fetchMyFiles();
        fetchNotifications();
    } else {
        setLoading(false);
    }
  }, [user, fetchTickets, fetchStats, fetchMyFiles, fetchNotifications]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (review.rating === 0) {
      toast({ variant: 'destructive', title: 'Ocena jest wymagana.' });
      return;
    }
    if (review.message.length < 10) {
      toast({ variant: 'destructive', title: 'Treść opinii musi mieć co najmniej 10 znaków.' });
      return;
    }
    setIsSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      rating: review.rating,
      title: review.title,
      message: review.message,
      source_url: window.location.href,
      user_agent: navigator.userAgent,
      status: 'pending',
      approved: false
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Błąd wysyłania opinii', description: `${error.message}${error.details ? ` (${error.details})` : ''}` });
    } else {
      toast({ title: 'Opinia wysłana!', description: 'Pojawi się na stronie po akceptacji.' });
      setReview({ rating: 0, title: '', message: '' });
    }
    setIsSubmittingReview(false);
  };

  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Użytkowniku';
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Panel Klienta - ByteClinic</title>
      </Helmet>
      <SectionTitle subtitle={`Witaj, ${getDisplayName()}`}>Panel Klienta</SectionTitle>
      
      {/* Header z powiadomieniami i szybkimi akcjami */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground font-mono">Witaj w panelu klienta</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Powiadomienia */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </Button>
            {showNotifications && (
              <Card className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] z-[9999] bg-card/95 backdrop-blur-sm border-primary/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-sm">Powiadomienia</CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={cn(
                          "p-3 rounded-lg border mb-2 cursor-pointer transition-colors",
                          notif.read ? "bg-muted/50 border-border/50" : "bg-primary/5 border-primary/20"
                        )}
                        onClick={() => {
                          // Mark as read logic here
                          setNotifications(prev => prev.map(n => 
                            n.id === notif.id ? { ...n, read: true } : n
                          ));
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {notif.type === 'status_update' && <Clock className="w-4 h-4 text-blue-400 mt-0.5" />}
                          {notif.type === 'completion' && <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />}
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{notif.title}</h4>
                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notif.created_at).toLocaleString('pl-PL')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Brak powiadomień</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          {/* Szybkie akcje */}
          <Button asChild size="sm">
            <Link to="/kontakt">Nowe zgłoszenie</Link>
          </Button>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-blue-400">Wszystkie zgłoszenia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Łącznie złożone</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-400">W naprawie</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-yellow-400">{stats.in_progress}</p>
            <p className="text-xs text-muted-foreground mt-1">Aktywne naprawy</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-green-400">Zakończone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-400">{stats.closed}</p>
            <p className="text-xs text-muted-foreground mt-1">Gotowe do odbioru</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-purple-400">Zadowolenie</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-400">98%</p>
            <p className="text-xs text-muted-foreground mt-1">Średnia ocena</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Moje zgłoszenia</CardTitle>
              <div className="flex flex-wrap gap-2 pt-4">
                <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Wszystkie</Button>
                <Button variant={filter === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('open')}>Otwarte</Button>
                <Button variant={filter === 'w_realizacji' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('w_realizacji')}>W realizacji</Button>
                <Button variant={filter === 'zakonczone' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('zakonczone')}>Zakończone</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div> : (
                tickets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary/20 text-left font-mono text-muted-foreground">
                          <th className="p-3">ID</th><th className="p-3">Urządzenie</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3 text-right">Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map(ticket => (
                          <tr key={ticket.id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="p-3 font-mono text-primary">{ticket.id.substring(0, 8)}</td>
                            <td className="p-3">{ticket.device || 'Brak'}</td>
                            <td className="p-3">{new Date(ticket.created_at).toLocaleDateString('pl-PL')}</td>
                            <td className="p-3"><StatusBadge status={ticket.status} /></td>
                            <td className="p-3 text-right"><Button asChild variant="link"><Link to={`/panel/zgloszenia/${ticket.id}`}>Szczegóły</Link></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-center text-muted-foreground p-8">Brak zgłoszeń dla wybranego filtra.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Moje pliki</CardTitle>
              <CardDescription>Przechowuj prywatne pliki powiązane z Twoimi zleceniami.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <input id="user-file-input" type="file" hidden onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !user) return;
                  setUploading(true);
                  try {
                    const uniqueName = `${user.id}/${crypto.randomUUID?.() || Date.now()}-${file.name}`;
                    const { error: upErr } = await supabase.storage
                      .from('user-files')
                      .upload(uniqueName, file, { contentType: file.type, upsert: false });
                    if (upErr) throw upErr;
                    const { error: insErr } = await supabase.from('user_files').insert({
                      user_id: user.id,
                      storage_path: uniqueName,
                      file_name: file.name,
                      content_type: file.type,
                      size: file.size,
                    });
                    if (insErr) throw insErr;
                    toast({ title: 'Przesłano plik' });
                    fetchMyFiles();
                  } catch (err) {
                    toast({ variant: 'destructive', title: 'Błąd uploadu', description: err.message || String(err) });
                  } finally {
                    setUploading(false);
                    const input = document.getElementById('user-file-input');
                    if (input) input.value = '';
                  }
                }} />
                <Button variant="outline" onClick={() => {
                  toast({ variant: 'destructive', title: 'Funkcjonalność niedostępna', description: 'System plików jest w trakcie implementacji.' });
                }} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Wyślij plik (w implementacji)
                </Button>
              </div>

              {filesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : myFiles.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Brak plików.</p>
              ) : (
                <ul className="space-y-2">
                  {myFiles.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 border border-border/40 rounded px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString('pl-PL')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={async () => {
                          const { data, error } = await supabase.storage
                            .from('user-files')
                            .createSignedUrl(f.storage_path, 60);
                          if (error) {
                            toast({ variant: 'destructive', title: 'Błąd pobierania', description: error.message });
                          } else if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        }}>Pobierz</Button>
                        <Button size="sm" variant="outline" onClick={async () => {
                          try {
                            const { error: delMetaErr } = await supabase.from('user_files')
                              .delete()
                              .eq('id', f.id);
                            if (delMetaErr) throw delMetaErr;
                            const { error: delFileErr } = await supabase.storage
                              .from('user-files')
                              .remove([f.storage_path]);
                            if (delFileErr) throw delFileErr;
                            toast({ title: 'Plik usunięty' });
                            fetchMyFiles();
                          } catch (err) {
                            toast({ variant: 'destructive', title: 'Błąd usuwania', description: err.message || String(err) });
                          }
                        }}>Usuń</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="bg-card/80 border-secondary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Wystaw opinię</CardTitle>
              <CardDescription>Podziel się wrażeniami z naszej usługi.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <Label>Ocena</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={cn("w-6 h-6 cursor-pointer transition-colors", review.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} onClick={() => setReview({...review, rating: star})} />
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="review-title">Tytuł</Label>
                  <Input id="review-title" value={review.title} onChange={e => setReview({...review, title: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="review-message">Treść (min. 10 znaków)</Label>
                  <Textarea id="review-message" value={review.message} onChange={e => setReview({...review, message: e.target.value})} />
                </div>
                <Button type="submit" disabled={isSubmittingReview} className="w-full">
                  {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Wyślij opinię
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default CustomerPanel;
