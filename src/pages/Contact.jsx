
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import MetaTags from '@/components/MetaTags';
import SectionTitle from '@/components/SectionTitle';
import SectionWrapper from '@/components/SectionWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { 
  Mail, Phone, Clock, MapPin, Loader2, MessageSquare, 
  ExternalLink, Navigation, Car, Zap, Shield, CheckCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Contact = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.display_name || '',
    email: user?.email || '',
    phone: '',
    device: '',
    message: '',
    consent: false,
  });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Imię i nazwisko jest wymagane.";
    if (!formData.email) newErrors.email = "E-mail jest wymagany.";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Nieprawidłowy format e-mail.";
    if (!formData.device) newErrors.device = "Kategoria jest wymagana.";
    if (!formData.message || formData.message.length < 10) newErrors.message = "Opis usterki musi mieć co najmniej 10 znaków.";
    if (!formData.consent) newErrors.consent = "Zgoda na przetwarzanie danych jest wymagana.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sprawdź czy użytkownik jest zalogowany
    if (!user) {
      toast({
        variant: "destructive",
        title: "Wymagane logowanie",
        description: "Aby wysłać zgłoszenie, musisz być zalogowany.",
      });
      return;
    }
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Błąd w formularzu",
        description: "Proszę poprawić zaznaczone pola.",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('diagnosis_requests').insert({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      device: formData.device,
      message: formData.message,
      consent: formData.consent,
      user_id: user?.id || null,
      source_url: window.location.href,
      user_agent: navigator.userAgent,
      status: 'new',
    });
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Błąd wysyłania zgłoszenia",
        description: `Wystąpił błąd: ${error.message}${error.details ? ` (${error.details})` : ''}`,
      });
    } else {
      setIsSubmitted(true);
      toast({
        title: "Wysłano zgłoszenie!",
        description: "Dzięki! Odezwiemy się niebawem.",
      });
    }
  };

  if (isSubmitted) {
    return (
      <PageTransition>
        <SectionWrapper className="flex flex-col items-center justify-center text-center min-h-[50vh]">
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="font-mono text-4xl text-primary mb-4">Dziękujemy!</h1>
              <p className="text-xl text-muted-foreground">Twoje zgłoszenie zostało wysłane pomyślnie.</p>
            </div>
            <div className="bg-card/70 border border-primary/20 rounded-lg p-6 max-w-md">
              <h3 className="font-semibold mb-2">Co dalej?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Skontaktujemy się w ciągu 24h</li>
                <li>• Przeprowadzimy diagnozę problemu</li>
                <li>• Wyślemy szczegółową wycenę</li>
              </ul>
            </div>
            <Button asChild className="mt-8">
              <a href="/">Wróć na stronę główną</a>
            </Button>
          </motion.div>
        </SectionWrapper>
      </PageTransition>
    );
  }

  const contactInfo = [
    {
      icon: Mail,
      title: "E-mail",
      value: "kontakt@byteclinic.pl",
      link: "mailto:kontakt@byteclinic.pl",
      description: "Odpowiadamy w ciągu 24h"
    },
    {
      icon: Phone,
      title: "Telefon",
      value: "+48 724 316 523",
      link: "tel:+48724316523",
      description: "Pon-Pt: 9:00-17:00"
    },

    {
      icon: Car,
      title: "Dojazd",
      value: "Mobilny serwis",
      description: "Dojazd płatny: 49 PLN w mieście, 99 PLN poza miastem"
    }
  ];

  const quickServices = [
    { name: "Diagnoza online", time: "1-2h", price: "99 PLN" },
    { name: "Szybka naprawa", time: "24-48h", price: "od 99 PLN" },
    { name: "Dojazd do klienta", time: "uzgodniony", price: "od 49 PLN" },
  ];

  return (
    <PageTransition>
      <MetaTags
        title="Kontakt - ByteClinic | Skontaktuj się z nami"
        description="Skontaktuj się z ByteClinic - profesjonalnym serwisem komputerowym w Zgorzelcu. Formularz kontaktowy, mapa, dane adresowe, godziny otwarcia."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/kontakt"
        type="website"
        canonical="https://www.byteclinic.pl/kontakt"
      />

      {/* Hero Section */}
      <SectionWrapper className="py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-primary">Kontakt</span> ByteClinic
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Masz problem z komputerem? Skontaktuj się z nami! Oferujemy szybką diagnozę 
            i profesjonalną naprawę w Zgorzelcu i okolicach.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="p-2">
              <Zap className="w-4 h-4 mr-1" />
              Szybka odpowiedź
            </Badge>
            <Badge variant="secondary" className="p-2">
              <Shield className="w-4 h-4 mr-1" />
              Bezpieczne dane
            </Badge>
            <Badge variant="secondary" className="p-2">
              <CheckCircle className="w-4 h-4 mr-1" />
              Gwarancja jakości
            </Badge>
          </div>
        </div>
      </SectionWrapper>

      {/* Contact Info Cards */}
      <SectionWrapper className="py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactInfo.map((info, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="text-center bg-card/80 border-primary/20 backdrop-blur-sm h-full">
                <CardContent className="p-6">
                  <info.icon className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{info.title}</h3>
                  {info.link ? (
                    <a 
                      href={info.link} 
                      className="text-primary hover:underline font-mono font-bold"
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="font-mono font-bold text-primary">{info.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{info.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* Main Content Grid */}
      <SectionWrapper className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-2xl flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  Formularz kontaktowy
                </CardTitle>
                <p className="text-muted-foreground">
                  Opisz swój problem, a skontaktujemy się z wyceną
                </p>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="text-center py-12">
                    <div className="mb-6">
                      <MessageSquare className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Wymagane logowanie</h3>
                      <p className="text-muted-foreground mb-6">
                        Aby wysłać zgłoszenie naprawcze, musisz być zalogowany w systemie.
                      </p>
                    </div>
                    <Button asChild size="lg">
                      <a href="/auth">Zaloguj się lub zarejestruj</a>
                    </Button>
                  </div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Imię i nazwisko *</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={e => handleChange('name', e.target.value)} 
                        required 
                        aria-invalid={!!errors.name} 
                        aria-describedby="name-error" 
                      />
                      {errors.name && <p id="name-error" className="text-sm text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={e => handleChange('email', e.target.value)} 
                        required 
                        aria-invalid={!!errors.email} 
                        aria-describedby="email-error" 
                      />
                      {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        type="tel" 
                        value={formData.phone} 
                        onChange={e => handleChange('phone', e.target.value)} 
                        placeholder="+48 123 456 789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="device">Kategoria problemu *</Label>
                      <Select 
                        name="device" 
                        value={formData.device} 
                        onValueChange={value => handleChange('device', value)} 
                        required
                      >
                        <SelectTrigger 
                          id="device" 
                          aria-invalid={!!errors.device} 
                          aria-describedby="device-error"
                        >
                          <SelectValue placeholder="Wybierz kategorię..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="laptop">Laptop</SelectItem>
                          <SelectItem value="pc">PC</SelectItem>
                          <SelectItem value="network">Sieć/Wi-Fi</SelectItem>
                          <SelectItem value="server">Serwer</SelectItem>
                          <SelectItem value="mobile">Urządzenie mobilne</SelectItem>
                          <SelectItem value="iot">IoT/ESP32/Arduino</SelectItem>
                          <SelectItem value="data">Odzyskiwanie danych</SelectItem>
                          <SelectItem value="other">Inne</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.device && <p id="device-error" className="text-sm text-destructive">{errors.device}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Opis problemu * (min. 10 znaków)</Label>
                    <Textarea 
                      id="message" 
                      name="message" 
                      value={formData.message} 
                      onChange={e => handleChange('message', e.target.value)} 
                      required 
                      minLength="10"
                      rows={5}
                      placeholder="Opisz dokładnie problem z urządzeniem..."
                      aria-invalid={!!errors.message} 
                      aria-describedby="message-error" 
                    />
                    {errors.message && <p id="message-error" className="text-sm text-destructive">{errors.message}</p>}
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="consent" 
                      name="consent" 
                      checked={formData.consent} 
                      onCheckedChange={checked => handleChange('consent', checked)} 
                      required 
                      aria-invalid={!!errors.consent} 
                      aria-describedby="consent-error" 
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="consent" className="text-sm text-muted-foreground">
                        Zgadzam się na przetwarzanie danych w celu realizacji zlecenia zgodnie z 
                        <a href="/polityka-prywatnosci" className="text-primary hover:underline"> polityką prywatności</a>. *
                      </label>
                      {errors.consent && <p id="consent-error" className="text-sm text-destructive">{errors.consent}</p>}
                    </div>
                  </div>
                  
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Wyślij zgłoszenie
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Map and Additional Info */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Map */}
            <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-xl flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  Znajdź nas na mapie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                  <div className="text-center p-6">
                    <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">ByteClinic Zgorzelec</h3>
                    <p className="text-muted-foreground mb-4">
                      ul. Przykładowa 1<br />
                      59-900 Zgorzelec<br />
                      woj. dolnośląskie
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Kliknij "Otwórz w Google Maps" poniżej,<br />
                      aby zobaczyć dokładną lokalizację.
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <a 
                      href="https://www.google.com/maps/place/Zgorzelec,+Poland" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Otwórz w Google Maps
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Services */}
            <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-xl">Popularne usługi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quickServices.map((service, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.time}</p>
                      </div>
                      <p className="font-mono text-primary font-bold">{service.price}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button asChild variant="secondary">
                    <a href="/cennik">Zobacz pełny cennik</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Working Hours */}
            <Card className="bg-card/80 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-xl flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Godziny pracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Poniedziałek - Piątek</span>
                    <span className="font-semibold">9:00 - 17:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sobota</span>
                    <span className="font-semibold">10:00 - 14:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Niedziela</span>
                    <span className="text-muted-foreground">Zamknięte</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-primary">
                    <strong>Awaryjne przypadki:</strong> Możliwość kontaktu poza godzinami pracy w pilnych sprawach.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* FAQ Quick */}
      <SectionWrapper className="py-8 bg-muted/30">
        <SectionTitle subtitle="Najczęściej zadawane pytania dotyczące kontaktu.">FAQ kontaktowe</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="bg-card/70 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Jak szybko otrzymam odpowiedź?</h3>
              <p className="text-muted-foreground text-sm">
                Standardowo odpowiadamy w ciągu 24 godzin w dni robocze. W pilnych przypadkach 
                prosimy o kontakt telefoniczny.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/70 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Czy mogę umówić wizytę?</h3>
              <p className="text-muted-foreground text-sm">
                Tak, wizyty umawiamy telefonicznie lub mailowo. Oferujemy również dojazd 
                do klienta na terenie Zgorzelca i okolic.
              </p>
            </CardContent>
          </Card>
        </div>
      </SectionWrapper>
    </PageTransition>
  );
};

export default Contact;
