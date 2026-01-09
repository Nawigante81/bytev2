import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Mail, MapPin, Clock, Send, AlertCircle } from 'lucide-react';
import emailService from '@/services/emailService';
import PageTransition from '@/components/PageTransition';
import { supabase } from '@/lib/supabaseClient';
import { checkEmailDeliveryStatus, showEmailStatusToast } from '@/lib/emailHelpers';

// Kategorie zgłoszeń z priorytetami
const TICKET_CATEGORIES = [
  { value: 'repair_request', label: 'Naprawa urządzenia', priority: 'high', color: '#ef4444' },
  { value: 'booking_inquiry', label: 'Pytanie o rezerwację', priority: 'medium', color: '#f59e0b' },
  { value: 'technical_support', label: 'Wsparcie techniczne', priority: 'medium', color: '#3b82f6' },
  { value: 'billing_question', label: 'Pytanie o fakturę', priority: 'low', color: '#10b981' },
  { value: 'general_inquiry', label: 'Pytanie ogólne', priority: 'low', color: '#6b7280' },
  { value: 'complaint', label: 'Reklamacja', priority: 'high', color: '#dc2626' },
  { value: 'suggestion', label: 'Sugestia', priority: 'low', color: '#8b5cf6' },
  { value: 'partnership', label: 'Współpraca biznesowa', priority: 'medium', color: '#059669' }
];

// Szablony komunikatów dla kategorii
const CATEGORY_TEMPLATES = {
  repair_request: 'Potrzebuję naprawy mojego urządzenia. Proszę o kontakt w celu ustalenia szczegółów.',
  booking_inquiry: 'Chciałbym/chciałabym zapytać o dostępne terminy rezerwacji.',
  technical_support: 'Potrzebuję pomocy technicznej związanej z...',
  billing_question: 'Mam pytanie dotyczące faktury/zapłaty za usługi.',
  general_inquiry: 'Mam ogólne pytanie dotyczące Państwa usług.',
  complaint: 'Chciałbym/chciałabym złożyć reklamację dotyczącą...',
  suggestion: 'Mam sugestię dotyczącą usprawnienia Państwa usług.',
  partnership: 'Jestem zainteresowany/a współpracą biznesową.'
};

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: '',
    priority: 'medium',
    subject: '',
    message: '',
    deviceType: '',
    urgencyLevel: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoMessage, setAutoMessage] = useState('');

  // Auto-generuj wiadomość na podstawie kategorii
  useEffect(() => {
    if (formData.category && CATEGORY_TEMPLATES[formData.category]) {
      const template = CATEGORY_TEMPLATES[formData.category];
      if (!formData.message || formData.message === autoMessage) {
        setFormData(prev => ({
          ...prev,
          message: template,
          subject: TICKET_CATEGORIES.find(c => c.value === formData.category)?.label || ''
        }));
        setAutoMessage(template);
      }
    }
  }, [formData.category]);

  // Aktualizuj priorytet na podstawie kategorii
  useEffect(() => {
    if (formData.category) {
      const category = TICKET_CATEGORIES.find(c => c.value === formData.category);
      if (category) {
        setFormData(prev => ({
          ...prev,
          priority: category.priority
        }));
      }
    }
  }, [formData.category]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji",
        description: "Imię i nazwisko jest wymagane."
      });
      return false;
    }

    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji",
        description: "Podaj prawidłowy adres e-mail."
      });
      return false;
    }

    if (!formData.category) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji",
        description: "Wybierz kategorię zgłoszenia."
      });
      return false;
    }

    if (!formData.subject.trim()) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji",
        description: "Temat jest wymagany."
      });
      return false;
    }

    if (!formData.message.trim()) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji",
        description: "Wiadomość jest wymagana."
      });
      return false;
    }

    return true;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  setIsSubmitting(true);

  try {
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    // Zapis do tabeli requests
    const { error: dbError } = await supabase.from('requests').insert({
      request_id: ticketId,
      type: formData.category || 'contact',
      source_page: 'contact',
      customer_name: formData.name.trim(),
      customer_email: formData.email.trim(),
      customer_phone: formData.phone?.trim() || null,
      subject: formData.subject.trim(),
      consent: true,
      device_type: formData.deviceType || null,
      device_model: null,
      device_description: null,
      message: formData.message.trim(),
      priority: formData.priority || 'medium',
      status: 'nowe',
      user_id: userId,
      source_url: window.location.href,
      user_agent: navigator.userAgent,
    });
    if (dbError) throw dbError;

    // Wyślij powiadomienie przez notify-system
    const notifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template: 'repair_request',
        recipient: formData.email,
        sendAdminCopy: true, // ⚠️ KLUCZOWE - administrator dostanie kopię
        data: {
          id: ticketId,
          requestId: ticketId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || 'Nie podano',
          device: formData.deviceType || 'Nie podano',
          message: formData.message,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
        }
      })
    });

    // Sprawdź czy powiadomienie zostało wysłane
    const emailStatus = await checkEmailDeliveryStatus(notifyResponse);

    // Wyświetl odpowiedni komunikat
    showEmailStatusToast(toast, emailStatus.warning, ticketId, getEstimatedResponseTime(formData.priority));

    setFormData({
      name: '',
      email: '',
      phone: '',
      category: '',
      priority: 'medium',
      subject: '',
      message: '',
      deviceType: '',
      urgencyLevel: 'normal'
    });
    setAutoMessage('');
  } catch (error) {
    console.error('Błąd wysyłania zgłoszenia:', error);
    toast({
      variant: "destructive",
      title: "Błąd wysyłania",
      description: "Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie lub skontaktuj się telefonicznie.",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  const getEstimatedResponseTime = (priority) => {
    const responseTimes = {
      high: '2-4 godziny',
      medium: '1 dzień roboczy',
      low: '2-3 dni robocze'
    };
    return responseTimes[priority] || '1 dzień roboczy';
  };

  const selectedCategory = TICKET_CATEGORIES.find(c => c.value === formData.category);

  return (
    <PageTransition>
      <Helmet>
        <title>Kontakt - Naprawa urządzeń • ByteClinic</title>
        <meta name="description" content="Skontaktuj się z ByteClinic. Naprawiamy komputery, telefony i inne urządzenia elektroniczne. Szybka diagnoza i profesjonalna obsługa." />
      </Helmet>

      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">Kontakt</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Masz pytanie lub potrzebujesz naprawy? Skontaktuj się z nami!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formularz kontaktowy */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Formularz kontaktowy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Dane osobowe */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Imię i nazwisko *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Jan Kowalski"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Adres e-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jan.kowalski@example.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+48 123 456 789"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deviceType">Typ urządzenia</Label>
                        <Select value={formData.deviceType} onValueChange={(value) => handleInputChange('deviceType', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz typ urządzenia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="computer">Komputer stacjonarny</SelectItem>
                            <SelectItem value="laptop">Laptop</SelectItem>
                            <SelectItem value="smartphone">Smartphone</SelectItem>
                            <SelectItem value="tablet">Tablet</SelectItem>
                            <SelectItem value="gaming-console">Konsola do gier</SelectItem>
                            <SelectItem value="smartwatch">Smartwatch</SelectItem>
                            <SelectItem value="other">Inne</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Kategoria i priorytet */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Kategoria zgłoszenia *</Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz kategorię" />
                          </SelectTrigger>
                          <SelectContent>
                            {TICKET_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="urgency">Pilność</Label>
                        <Select value={formData.urgencyLevel} onValueChange={(value) => handleInputChange('urgencyLevel', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Niska</SelectItem>
                            <SelectItem value="normal">Normalna</SelectItem>
                            <SelectItem value="high">Wysoka</SelectItem>
                            <SelectItem value="urgent">Pilna</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Temat */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Temat *</Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="Krótki opis problemu"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        required
                      />
                    </div>

                    {/* Wiadomość */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Wiadomość *</Label>
                      <Textarea
                        id="message"
                        placeholder="Opisz swój problem szczegółowo..."
                        rows={6}
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        required
                      />
                    </div>

                    {/* Informacje o priorytecie */}
                    {selectedCategory && (
                      <div 
                        className="p-4 rounded-lg border-l-4"
                        style={{ 
                          backgroundColor: `${selectedCategory.color}10`,
                          borderLeftColor: selectedCategory.color 
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle 
                            className="h-5 w-5 mt-0.5" 
                            style={{ color: selectedCategory.color }}
                          />
                          <div>
                            <h4 className="font-medium" style={{ color: selectedCategory.color }}>
                              Kategoria: {selectedCategory.label}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Priorytet: {selectedCategory.priority === 'high' ? 'Wysoki' : selectedCategory.priority === 'medium' ? 'Średni' : 'Niski'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Szacowany czas odpowiedzi: {getEstimatedResponseTime(selectedCategory.priority)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Wysyłanie...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Wyślij zgłoszenie
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Informacje kontaktowe */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dane kontaktowe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Telefon</p>
                      <p className="text-sm text-muted-foreground">+48 724 316 523</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">kontakt@byteclinic.pl</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Lokalizacja</p>
                      <p className="text-sm text-muted-foreground">Zgorzelec, Polska</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Godziny pracy</p>
                      <p className="text-sm text-muted-foreground">
                        Pon-Pt: 9:00-17:00<br />
                        Sob: 10:00-14:00
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dlaczego ByteClinic?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <p className="text-sm">Szybka diagnoza problemu</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <p className="text-sm">Transparentne ceny</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <p className="text-sm">Gwarancja na naprawy</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <p className="text-sm">Bezpłatna wycena</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Contact;
