
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const OrderModal = memo(({ isOpen, setIsOpen, service }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    consent: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        name: user.user_metadata?.display_name || user.user_metadata?.name || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (!isOpen) return;

    document.addEventListener('keydown', handleEsc);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      nameInputRef.current?.focus?.();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, setIsOpen]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '', email: '', phone: '', message: '', consent: false
    });
    setErrors({});
  }, []);

  const fetchServiceId = useCallback(async () => {
    const isUuid = (value) =>
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    if (!service) return { id: null, reason: 'Brak danych uslugi.' };

    if (isUuid(service.id)) return { id: service.id, reason: null };
    if (isUuid(service.service_id)) return { id: service.service_id, reason: null };

    const slug = typeof service.slug === 'string' ? service.slug.trim() : '';
    const serviceType = typeof service.service_type === 'string' ? service.service_type.trim() : '';
    const title = typeof service.title === 'string' ? service.title.trim() : '';
    const name = typeof service.name === 'string' ? service.name.trim() : '';

    const trySelect = async (column, value) => {
      const { data, error } = await supabase
        .from('service_catalog')
        .select('id')
        .eq(column, value)
        .limit(1)
        .maybeSingle();
      return { data, error };
    };

    const candidates = [
      { column: 'slug', value: slug },
      { column: 'service_type', value: serviceType || slug },
      { column: 'title', value: title || name },
      { column: 'name', value: name || title },
    ].filter((c) => typeof c.value === 'string' && c.value.length > 0);

    let slugColumnMissing = false;

    for (const candidate of candidates) {
      if (candidate.column === 'slug' && slugColumnMissing) continue;

      const { data, error } = await trySelect(candidate.column, candidate.value);

      if (error) {
        const msg = String(error.message || '');
        if (candidate.column === 'slug' && msg.includes('service_catalog.slug') && msg.includes('does not exist')) {
          slugColumnMissing = true;
          continue;
        }
        if (msg.includes(`service_catalog.${candidate.column}`) && msg.includes('does not exist')) {
          continue;
        }
        return { id: null, reason: error.message || 'Blad pobierania ID uslugi.' };
      }

      if (data?.id) return { id: data.id, reason: null };
    }

    return { id: null, reason: 'Nie znaleziono uslugi w katalogu.' };
  }, [service]);

  const validateForm = () => {
    const newErrors = {};
    if (formData.name.length < 2) newErrors.name = 'Imię musi mieć co najmniej 2 znaki.';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Nieprawidłowy format e-mail.';
    if (formData.phone && !/^[0-9 +()-]{6,}$/.test(formData.phone)) newErrors.phone = 'Nieprawidłowy format numeru telefonu.';
    if (formData.message.length < 10) newErrors.message = 'Wiadomość musi mieć co najmniej 10 znaków.';
    if (!formData.consent) newErrors.consent = 'Zgoda jest wymagana.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;

    setIsLoading(true);

    try {
      let svc = null;
      const { id: serviceId } = await fetchServiceId();
      if (serviceId) {
        svc = { id: serviceId };
      }

      if (!svc) {
      // Use maybeSingle + limit(1) to avoid Postgrest 'JSON object requested, multiple (or no) rows returned'
      // if the slug isn't unique or a row is missing. We still handle the not-found case below.
      const { data: svcData, error: slugError } = await supabase
        .from('service_catalog')
        .select('id')
        .eq('slug', service.slug)
        .limit(1)
        .maybeSingle();
      
      if (slugError) {
        throw new Error(slugError.message);
      }
      if (!svcData) {
        throw new Error('Nie znaleziono usługi (slug nie istnieje).');
      }
      svc = svcData;
      }

      const orderData = {
        service_id: svc.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        consent: formData.consent,
        user_id: user?.id ?? null,
        source_url: window.location.href,
        user_agent: navigator.userAgent,
        status: 'new'
      };

      const { error: insertError } = await supabase.from('service_orders').insert(orderData);

      if (insertError) throw insertError;

      toast({
        title: '✅ Zamówienie przyjęte!',
        description: 'Dziękujemy! Wkrótce się skontaktujemy, aby potwierdzić szczegóły.',
      });

      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Supabase error:', error);
      toast({
        variant: 'destructive',
        title: 'Błąd wysyłania!',
        description: `Wystąpił błąd: ${error.message}${error.details ? ` (${error.details})` : ''}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchServiceId, service, formData, user, isLoading, toast, resetForm, setIsOpen]);

  if (!service) return null;

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative bg-card/80 border border-primary/30 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
              aria-label="Zamknij"
            >
              <X className="h-6 w-6" />
            </Button>

            <h2 className="font-mono text-2xl md:text-3xl font-bold text-primary mb-2" style={{ textShadow: '0 0 8px hsl(var(--primary))' }}>
              Zamówienie usługi
            </h2>
            <p className="text-muted-foreground mb-6">Usługa: <span className="font-bold text-secondary">{service.title}</span></p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Imię i nazwisko</Label>
                  <Input ref={nameInputRef} id="name" name="name" value={formData.name} onChange={handleChange} required autoComplete="name" />
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required autoComplete="email" />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} autoComplete="tel" />
                {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="message">Krótki opis / wiadomość</Label>
                <Textarea id="message" name="message" value={formData.message} onChange={handleChange} required minLength="10" rows="4" placeholder="Opisz krótko problem lub zostaw dodatkowe informacje..."/>
                {errors.message && <p className="text-destructive text-sm mt-1">{errors.message}</p>}
              </div>
              <div className="flex items-start space-x-2">
                <input type="checkbox" id="consent" name="consent" checked={formData.consent} onChange={handleChange} className="mt-1 accent-primary" />
                <label htmlFor="consent" className="text-sm text-muted-foreground">
                  Wyrażam zgodę na przetwarzanie moich danych osobowych w celu realizacji zamówienia.
                </label>
              </div>
              {errors.consent && <p className="text-destructive text-sm">{errors.consent}</p>}

              <Button type="submit" size="lg" className="w-full" disabled={isLoading || !formData.consent}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  'Wyślij zamówienie'
                )}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    ,
    portalTarget
  );
});

OrderModal.displayName = 'OrderModal';

export default OrderModal;
