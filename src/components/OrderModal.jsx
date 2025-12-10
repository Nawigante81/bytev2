
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, setIsOpen]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '', email: '', phone: '', message: '', consent: false
    });
    setErrors({});
  }, []);

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
      // Use maybeSingle + limit(1) to avoid Postgrest 'JSON object requested, multiple (or no) rows returned'
      // if the slug isn't unique or a row is missing. We still handle the not-found case below.
      const { data: svc, error: slugError } = await supabase
        .from('service_catalog')
        .select('id')
        .eq('slug', service.slug)
        .limit(1)
        .maybeSingle();
      
      if (slugError) {
        throw new Error(slugError.message);
      }
      if (!svc) {
        throw new Error('Nie znaleziono usługi (slug nie istnieje).');
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
  }, [service, formData, user, isLoading, toast, resetForm, setIsOpen]);

  if (!service) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
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
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required autoComplete="name" />
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
  );
});

OrderModal.displayName = 'OrderModal';

export default OrderModal;
