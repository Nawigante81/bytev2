import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Loader2, FileText, MessageSquare, Send, Paperclip, Download, Trash2, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionTitle from '@/components/SectionTitle';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const STATUS_CONFIG = {
  new_request: { label: 'Nowe zgłoszenie', className: 'bg-blue-500/20 text-blue-300' },
  open: { label: 'Analiza', className: 'bg-cyan-500/20 text-cyan-300' },
  waiting_for_parts: { label: 'Oczekiwanie na części', className: 'bg-amber-500/20 text-amber-200' },
  in_repair: { label: 'W naprawie', className: 'bg-yellow-500/20 text-yellow-300' },
  repair_completed: { label: 'Naprawa zakończona', className: 'bg-emerald-500/20 text-emerald-300' },
  ready_for_pickup: { label: 'Gotowe do odbioru', className: 'bg-green-500/20 text-green-300' },
  nowe: { label: 'Nowe zgłoszenie', className: 'bg-blue-500/20 text-blue-300' },
  w_realizacji: { label: 'W realizacji', className: 'bg-yellow-500/20 text-yellow-300' },
  zakonczone: { label: 'Zakończone', className: 'bg-emerald-500/20 text-emerald-300' },
};

const resolveStatusMeta = (status) => {
  if (!status) return { label: 'Nieznany', className: 'bg-gray-500/20 text-gray-300' };

  return STATUS_CONFIG[status] || { label: status.replace(/_/g, ' '), className: 'bg-gray-500/20 text-gray-300' };
};

const TicketStatus = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalComments, setTotalComments] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Szukaj po request_id (kod pokazany klientowi) lub UUID id
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .or(`request_id.eq.${id},id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setError('Nie znaleziono zgłoszenia o podanym ID lub wystąpił błąd.');
      console.error(error);
      setTicket(null);
    } else {
      setTicket(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const fetchComments = useCallback(async () => {
    if (!ticket?.id) return;
    setCommentsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from('ticket_comments')
      .select('*', { count: 'exact' })
      .eq('request_id', ticket.id)
      .order('created_at', { ascending: true })
      .range(from, to);
    if (error) {
      console.error('Comments error:', error);
    } else {
      setComments(data || []);
      if (typeof count === 'number') setTotalComments(count);
    }
    setCommentsLoading(false);
  }, [ticket, page, pageSize]);

  const fetchAttachments = useCallback(async () => {
    if (!ticket?.id) return;
    setAttachmentsLoading(true);
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('request_id', ticket.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Attachments error:', error);
    } else {
      setAttachments(data || []);
    }
    setAttachmentsLoading(false);
  }, [ticket]);

  useEffect(() => {
    if (ticket) {
      fetchComments();
      fetchAttachments();
    }
  }, [ticket, fetchComments, fetchAttachments]);

  useEffect(() => {
    if (!ticket?.id) return;
    const channel = supabase
      .channel(`ticket-comments-${ticket.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comments', filter: `request_id=eq.${ticket.id}` }, () => {
        fetchComments();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket, fetchComments]);

  const handleAddComment = async () => {
    if (!user) {
      toast({ title: 'Zaloguj się', description: 'Tylko zalogowani mogą dodawać komentarze.', variant: 'destructive' });
      return;
    }
    if (!comment.trim() || !ticket?.id) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('ticket_comments').insert({
      request_id: ticket.id,
      user_id: user.id,
      body: comment.trim(),
    });
    setIsSubmitting(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Błąd dodawania komentarza', description: error.message });
    } else {
      setComment('');
      fetchComments();
      toast({ title: 'Dodano komentarz' });
    }
  };

  const handleFileInputClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !ticket?.id) return;
    if (!user) {
      toast({ title: 'Zaloguj się', description: 'Tylko zalogowani mogą przesyłać pliki.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const uniqueName = `${crypto.randomUUID?.() || Date.now()}-${file.name}`;
      const storagePath = `${ticket.id}/${uniqueName}`;
      const { error: upErr } = await supabase.storage
        .from('ticket-attachments')
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('ticket_attachments').insert({
        request_id: ticket.id,
        user_id: user.id,
        storage_path: storagePath,
        file_name: file.name,
        content_type: file.type,
        size: file.size,
      });
      if (insErr) throw insErr;

      toast({ title: 'Plik przesłany' });
      fetchAttachments();
    } catch (err) {
      console.error('Upload error:', err);
      toast({ variant: 'destructive', title: 'Błąd uploadu', description: err.message || String(err) });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (att) => {
    const { data, error } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(att.storage_path, 60);
    if (error) {
      toast({ variant: 'destructive', title: 'Błąd pobierania', description: error.message });
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleDeleteAttachment = async (att) => {
    if (!user) return;
    try {
      const { error: delMetaErr } = await supabase
        .from('ticket_attachments')
        .delete()
        .eq('id', att.id);
      if (delMetaErr) throw delMetaErr;

      const { error: delFileErr } = await supabase.storage
        .from('ticket-attachments')
        .remove([att.storage_path]);
      if (delFileErr) throw delFileErr;

      toast({ title: 'Załącznik usunięty' });
      fetchAttachments();
    } catch (err) {
      console.error('Delete attachment error:', err);
      toast({ variant: 'destructive', title: 'Błąd usuwania', description: err.message || String(err) });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-16 h-16 animate-spin text-primary" /></div>;
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-mono text-destructive">{error || 'Nie znaleziono zgłoszenia'}</h1>
        <Button asChild variant="link" className="mt-4"><Link to="/">Wróć na stronę główną</Link></Button>
      </div>
    );
  }

  const statusMeta = resolveStatusMeta(ticket.status);
  const deviceLabel = ticket.device_type || ticket.device_model || ticket.device_description || 'Brak informacji';
  const customerLabel = ticket.customer_name || ticket.customer_email || 'Nieznany klient';
  const displayId = ticket.request_id || (ticket.id ? ticket.id.substring(0, 8) : '—');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Helmet>
        <title>Status zgłoszenia {displayId} - ByteClinic</title>
        <meta name="description" content={`Sprawdź status zgłoszenia serwisowego ${displayId}.`} />
      </Helmet>

      <SectionTitle subtitle="Status zgłoszenia">{displayId}</SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Podsumowanie zgłoszenia</span>
                <span className={cn("text-sm font-mono uppercase px-3 py-1 rounded-full", statusMeta.className)}>
                  {statusMeta.label}
                </span>
              </CardTitle>
              <CardDescription>Utworzono: {new Date(ticket.created_at).toLocaleString('pl-PL')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p><strong>Urządzenie:</strong> {deviceLabel}</p>
              <p><strong>Klient:</strong> {customerLabel}</p>
              <p><strong>Opis problemu:</strong> {ticket.message || 'Brak'}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-secondary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="text-secondary" /> Komentarze</CardTitle>
            </CardHeader>
            <CardContent>
              {commentsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Brak komentarzy.</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((c) => (
                    <div key={c.id} className="border border-border/40 rounded p-3">
                      <div className="text-xs text-muted-foreground mb-1">{new Date(c.created_at).toLocaleString('pl-PL')}</div>
                      <p className="whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {totalComments > pageSize && (
                <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                  <span>
                    {Math.min((page - 1) * pageSize + 1, totalComments)}–{Math.min(page * pageSize, totalComments)} z {totalComments}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Poprzednia</Button>
                    <Button variant="outline" size="sm" disabled={page * pageSize >= totalComments} onClick={() => setPage((p) => p + 1)}>Następna</Button>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-2">
                <Label htmlFor="comment">Dodaj komentarz</Label>
                {!user && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Aby dodać komentarz, zaloguj się w panelu.
                  </div>
                )}
                <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Twoja wiadomość..." disabled={!user || isSubmitting} />
                <div className="flex justify-end items-center pt-2 gap-2">
                  <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
                  <Button variant="ghost" size="sm" onClick={handleFileInputClick} disabled={!user || uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />} Załącz plik
                  </Button>
                  <Button onClick={handleAddComment} disabled={!user || isSubmitting || !comment.trim()}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Wyślij
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Szczegóły</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-center py-4">Brak dodatkowych informacji.</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-secondary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="text-secondary" /> Załączniki</CardTitle>
            </CardHeader>
            <CardContent>
              {attachmentsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : attachments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Brak załączników.</p>
              ) : (
                <ul className="space-y-2">
                  {attachments.map(att => (
                    <li key={att.id} className="flex items-center justify-between gap-3 border border-border/40 rounded px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(att.created_at).toLocaleString('pl-PL')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(att)}>
                          <Download className="w-4 h-4 mr-1" /> Pobierz
                        </Button>
                        {user && (
                          <Button size="sm" variant="outline" onClick={() => handleDeleteAttachment(att)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Usuń
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default TicketStatus;
