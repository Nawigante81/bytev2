
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionTitle from '@/components/SectionTitle';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AdminTickets = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const isAuthenticated = profile?.role === 'admin';

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('diagnosis_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Błąd odczytu zgłoszeń.', description: error.message });
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  }, [toast, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
        fetchTickets();
    } else {
        setLoading(false);
    }
  }, [fetchTickets, isAuthenticated]);

  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter(t => t.status === statusFilter));
    }
  }, [statusFilter, tickets]);


  const handleStatusChange = async (ticketId, newStatus) => {
    const { error } = await supabase
      .from('diagnosis_requests')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      toast({ variant: 'destructive', title: 'Błąd aktualizacji statusu.', description: error.message });
    } else {
      toast({ title: 'Status zaktualizowany!' });
      fetchTickets();
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'open': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-16 h-16 animate-spin text-primary" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center py-20">
        <Helmet>
          <title>Brak dostępu - ByteClinic</title>
        </Helmet>
        <Card className="w-full max-w-md bg-card/80 border-destructive/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-mono text-destructive">Brak dostępu</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Nie masz uprawnień do przeglądania tej strony.</p>
            <Button asChild className="mt-4 w-full"><Link to="/">Wróć na stronę główną</Link></Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Helmet>
        <title>Zgłoszenia - Panel Admina - ByteClinic</title>
      </Helmet>
      <SectionTitle subtitle="Panel administracyjny">Zgłoszenia</SectionTitle>

      <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Lista zgłoszeń ({filteredTickets.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtruj status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Wszystkie</SelectItem>
                  <SelectItem value="new">Nowe</SelectItem>
                  <SelectItem value="open">Otwarte</SelectItem>
                  <SelectItem value="in_progress">W trakcie</SelectItem>
                  <SelectItem value="closed">Zamknięte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/20 text-left font-mono text-muted-foreground">
                  <th className="p-3">ID</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Klient</th>
                  <th className="p-3">Urządzenie</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-3 font-mono text-primary"><Link to={`/panel/zgloszenia/${ticket.id}`} className="hover:underline">{ticket.id.substring(0,8)}</Link></td>
                    <td className="p-3">{new Date(ticket.created_at).toLocaleDateString('pl-PL')}</td>
                    <td className="p-3">{ticket.name}</td>
                    <td className="p-3">{ticket.device}</td>
                    <td className="p-3">
                      <Select value={ticket.status} onValueChange={(newStatus) => handleStatusChange(ticket.id, newStatus)}>
                        <SelectTrigger className={cn("text-xs h-8", getStatusClass(ticket.status))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Nowe</SelectItem>
                          <SelectItem value="open">Otwarte</SelectItem>
                          <SelectItem value="in_progress">W trakcie</SelectItem>
                          <SelectItem value="closed">Zamknięte</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-right">
                      <Button asChild variant="ghost" size="icon">
                        <Link to={`/panel/zgloszenia/${ticket.id}`}><ExternalLink className="w-4 h-4" /></Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTickets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Brak zgłoszeń o wybranym statusie.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminTickets;
