import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';

const AdminServices = () => {
  const { toast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimeoutRef = useRef(null);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const CACHE_DURATION = 30000; // 30 sekund

  const [form, setForm] = useState({ slug: '', title: '', description: '', price_cents: 0, active: true });

  const fetchServices = useCallback(async (forceRefresh = false) => {
    // Sprawdź cache
    const now = Date.now();
    if (!forceRefresh && cacheRef.current.data && (now - cacheRef.current.timestamp) < CACHE_DURATION) {
      setServices(cacheRef.current.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('service_catalog')
      .select('id, slug, title, price_cents, active, updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ variant: 'destructive', title: 'Błąd pobierania usług', description: error.message });
      setServices([]);
    } else {
      const serviceData = data || [];
      setServices(serviceData);
      // Zapisz do cache
      cacheRef.current = { data: serviceData, timestamp: now };
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleCreate = async () => {
    const slug = form.slug.trim();
    const title = form.title.trim();
    if (!slug || !title) {
      toast({ variant: 'destructive', title: 'Uzupełnij slug i tytuł' });
      return;
    }
    if (!/^[a-z0-9-]{2,}$/.test(slug)) {
      toast({ variant: 'destructive', title: 'Nieprawidłowy slug', description: 'Dozwolone małe litery, cyfry i myślnik. Min. 2 znaki.' });
      return;
    }

    // Pre-walidacja unikalności sluga, by zwrócić przyjazny komunikat
    const { data: exists, error: existsErr } = await supabase
      .from('service_catalog')
      .select('id')
      .eq('slug', slug)
      .limit(1);
    if (!existsErr && exists && exists.length > 0) {
      toast({ variant: 'destructive', title: 'Slug zajęty', description: 'Wybierz inny slug – musi być unikalny.' });
      return;
    }

    setCreating(true);
    const payload = {
      slug,
      title,
      description: form.description?.trim() || null,
      price_cents: Number.isFinite(+form.price_cents) ? Math.max(0, +form.price_cents) : 0,
      active: !!form.active,
    };
    const { error } = await supabase.from('service_catalog').insert(payload);
    setCreating(false);
    if (error) {
      const msg = error.message?.includes('service_catalog_slug_key') ? 'Slug musi być unikalny.' : error.message;
      toast({ variant: 'destructive', title: 'Błąd dodawania usługi', description: msg });
    } else {
      toast({ title: 'Dodano usługę' });
      setForm({ slug: '', title: '', description: '', price_cents: 0, active: true });
      fetchServices(true); // Wymuś odświeżenie
    }
  };

  const toggleActive = async (row) => {
    const { error } = await supabase
      .from('service_catalog')
      .update({ active: !row.active })
      .eq('id', row.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Błąd zmiany statusu', description: error.message });
    } else {
      fetchServices(true); // Wymuś odświeżenie
    }
  };

  const RowEditor = ({ row }) => {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [edit, setEdit] = useState({
      title: row.title || '',
      description: row.description || '',
      price_cents: row.price_cents ?? 0,
    });

    const save = async () => {
      setSaving(true);
      const payload = {
        title: edit.title.trim(),
        description: edit.description?.trim() || null,
        price_cents: Number.isFinite(+edit.price_cents) ? Math.max(0, +edit.price_cents) : 0,
      };
      const { error } = await supabase
        .from('service_catalog')
        .update(payload)
        .eq('id', row.id);
      setSaving(false);
      if (error) {
        toast({ variant: 'destructive', title: 'Błąd zapisu', description: error.message });
      } else {
        toast({ title: 'Zapisano zmiany' });
        setOpen(false);
        fetchServices(true); // Wymuś odświeżenie
      }
    };

    const remove = async () => {
      const { error } = await supabase.from('service_catalog').delete().eq('id', row.id);
      if (error) {
        toast({ variant: 'destructive', title: 'Błąd usuwania', description: error.message });
      } else {
        toast({ title: 'Usunięto usługę' });
        fetchServices(true); // Wymuś odświeżenie
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => toggleActive(row)}>{row.active ? 'Wyłącz' : 'Włącz'}</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Pencil className="w-4 h-4 mr-1" /> Edytuj</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj usługę</DialogTitle>
              <DialogDescription>Edytujesz: {row.slug}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tytuł</Label>
                <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Opis</Label>
                <Textarea rows={4} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Cena (grosze)</Label>
                <Input type="number" inputMode="numeric" value={edit.price_cents} onChange={(e) => setEdit({ ...edit, price_cents: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Zapisz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-destructive border-destructive"><Trash2 className="w-4 h-4 mr-1" /> Usuń</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć usługę?</AlertDialogTitle>
              <AlertDialogDescription>Operacja nieodwracalna.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={remove}>Usuń</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Usługi - Panel Admina - ByteClinic</title>
      </Helmet>
      <SectionTitle subtitle="Zarządzaj katalogiem usług">Usługi</SectionTitle>

      <Card className="bg-card/80 border-primary/20 backdrop-blur-sm mb-8">
        <CardHeader>
          <CardTitle>Dodaj usługę</CardTitle>
          <CardDescription>Slug musi być unikalny. Cena w groszach (opcjonalna).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="np. diag-pc" />
            </div>
            <div className="grid gap-2 md:col-span-1">
              <Label>Tytuł</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nazwa usługi" />
            </div>
            <div className="grid gap-2 md:col-span-1">
              <Label>Cena (grosze)</Label>
              <Input type="number" inputMode="numeric" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} />
            </div>
            <div className="grid gap-2 md:col-span-1">
              <Label>&nbsp;</Label>
              <Button onClick={handleCreate} disabled={creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Dodaj</Button>
            </div>
          </div>
          <div className="grid gap-2 mt-4">
            <Label>Opis</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 border-secondary/20 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lista usług ({services.length})</CardTitle>
              <CardDescription>Aktywne usługi są widoczne publicznie.</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (refreshTimeoutRef.current) return;
                setRefreshing(true);
                refreshTimeoutRef.current = setTimeout(() => {
                  refreshTimeoutRef.current = null;
                }, 1000);
                fetchServices(true).finally(() => setRefreshing(false));
              }}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Odśwież
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : services.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Brak usług w katalogu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-mono text-muted-foreground">
                    <th className="p-3">Slug</th>
                    <th className="p-3">Tytuł</th>
                    <th className="p-3">Cena (gr)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Aktualizacja</th>
                    <th className="p-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="p-3 font-mono text-primary">{row.slug}</td>
                      <td className="p-3">{row.title}</td>
                      <td className="p-3">{row.price_cents ?? 0}</td>
                      <td className="p-3">{row.active ? 'Aktywna' : 'Wyłączona'}</td>
                      <td className="p-3">{new Date(row.updated_at).toLocaleString('pl-PL')}</td>
                      <td className="p-3 text-right"><RowEditor row={row} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
};

export default AdminServices;
