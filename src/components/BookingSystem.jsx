import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, MapPin, Phone, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useBookingNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabaseClient';

// Symulacja dostępnych terminów
const generateAvailableSlots = (date) => {
  const slots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
  ];
  
  // Symulacja zajętych terminów (30% prawdopodobieństwa)
  return slots.filter(() => Math.random() > 0.3);
};

const serviceTypes = [
  { 
    id: 'diag-laptop', 
    name: 'Diagnoza laptopa', 
    duration: 60, 
    price: 99, 
    description: 'Pełna analiza problemu + raport' 
  },
  { 
    id: 'diag-pc', 
    name: 'Diagnoza PC', 
    duration: 90, 
    price: 129, 
    description: 'Diagnoza + kosztorys naprawy' 
  },
  { 
    id: 'repair-quick', 
    name: 'Szybka naprawa', 
    duration: 45, 
    price: 79, 
    description: 'Proste problemy (wymiana części)' 
  },
  { 
    id: 'consultation', 
    name: 'Konsultacja IT', 
    duration: 30, 
    price: 59, 
    description: 'Doradztwo techniczne online' 
  },
  { 
    id: 'pickup', 
    name: 'Odbiór sprzętu', 
    duration: 30, 
    price: 0, 
    description: 'Darmowy odbiór w Zgorzelcu' 
  }
];

const BookingSystem = () => {
  const { toast } = useToast();
  const { completeBooking } = useBookingNotifications();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    device: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Generuj daty (następne 14 dni roboczych)
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Pomiń weekendy
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          day: date.getDate(),
          month: date.toLocaleDateString('pl-PL', { month: 'short' })
        });
      }
    }
    return dates;
  };

  const availableDates = generateDates();

  // Ładuj dostępne terminy gdy wybierzesz datę
  useEffect(() => {
    if (selectedDate) {
      setAvailableSlots(generateAvailableSlots(selectedDate));
      setSelectedSlot('');
    }
  }, [selectedDate]);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const selectedServiceData = serviceTypes.find(s => s.id === selectedService);
      const bookingId = 'BC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const selectedDateData = availableDates.find(d => d.value === selectedDate);

      const bookingData = {
        bookingId,
        email: customerInfo.email,
        name: customerInfo.name,
        date: selectedDateData?.label || selectedDate,
        time: selectedSlot,
        service: selectedServiceData?.name,
        duration: selectedServiceData?.duration,
        price: selectedServiceData?.price,
        device: customerInfo.device,
        phone: customerInfo.phone,
        description: customerInfo.description,
      };

      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: bookingData,
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Błąd po stronie funkcji');
      }

      console.log('✅ Rezerwacja utworzona:', data);

      try {
        completeBooking?.(bookingData);
      } catch (completeError) {
        console.warn('completeBooking rzucił błędem, ale rezerwacja jest OK:', completeError);
      }

      setBookingConfirmed(true);
    } catch (error) {
      console.error('Błąd rezerwacji:', error);
      toast({
        variant: 'destructive',
        title: 'Błąd rezerwacji',
        description: 'Wystąpił problem. Spróbuj ponownie lub zadzwoń do nas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedSlot('');
    setSelectedService('');
    setCustomerInfo({
      name: '',
      email: '',
      phone: '',
      device: '',
      description: ''
    });
    setBookingConfirmed(false);
  };

  if (bookingConfirmed) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-400 mb-2">Rezerwacja potwierdzona!</h2>
            <p className="text-muted-foreground mb-6">
              Twoja wizyta została zarezerwowana. Otrzymasz email z potwierdzeniem i przypomnieniem.
            </p>
            
            <div className="bg-background/60 rounded-lg p-4 mb-6">
              <h3 className="font-mono text-lg text-primary mb-2">Szczegóły wizyty:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Data:</strong> {availableDates.find(d => d.value === selectedDate)?.label}</p>
                <p><strong>Godzina:</strong> {selectedSlot}</p>
                <p><strong>Usługa:</strong> {serviceTypes.find(s => s.id === selectedService)?.name}</p>
                <p><strong>Telefon kontaktowy:</strong> {customerInfo.phone}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                📍 Miejsce: Zgorzelec (adres zostanie podany w emailu)<br/>
                ⏰ Prosimy o punktualne przybycie<br/>
                📞 W razie pytań: +48 724 316 523
              </p>
              <Button onClick={resetBooking} variant="outline">
                Nowa rezerwacja
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3, 4].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= stepNum 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {stepNum}
            </div>
            {stepNum < 4 && (
              <div className={`w-12 h-1 mx-2 ${
                step > stepNum ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Wybierz datę wizyty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableDates.map((date) => (
                    <motion.button
                      key={date.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDate(date.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedDate === date.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{date.day}</div>
                        <div className="text-sm text-muted-foreground">{date.month}</div>
                        <div className="text-xs mt-1">{date.label.split(',')[0]}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                {selectedDate && (
                  <div className="mt-6 flex justify-end">
                    <Button onClick={() => setStep(2)}>
                      Dalej: Wybierz godzinę →
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Wybierz godzinę
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  Dostępne terminy na {availableDates.find(d => d.value === selectedDate)?.label}
                </div>
                
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <p className="text-yellow-400">Brak dostępnych terminów w tym dniu</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setStep(1)}
                    >
                      ← Wybierz inny dzień
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {availableSlots.map((slot) => (
                      <motion.button
                        key={slot}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          selectedSlot === slot
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-mono text-lg">{slot}</div>
                      </motion.button>
                    ))}
                  </div>
                )}
                
                {selectedSlot && (
                  <div className="mt-6 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      ← Cofnij
                    </Button>
                    <Button onClick={() => setStep(3)}>
                      Dalej: Wybierz usługę →
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Wybierz usługę
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {serviceTypes.map((service) => (
                    <motion.button
                      key={service.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedService(service.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedService === service.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>⏱️ {service.duration} min</span>
                            <span className="font-mono text-primary">
                              {service.price === 0 ? 'Darmowe' : `od ${service.price} PLN`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                {selectedService && (
                  <div className="mt-6 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      ← Cofnij
                    </Button>
                    <Button onClick={() => setStep(4)}>
                      Dalej: Dane kontaktowe →
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Dane kontaktowe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Imię i nazwisko *</label>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        placeholder="Jan Kowalski"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email *</label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        placeholder="jan@example.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Telefon *</label>
                    <Input
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Urządzenie *</label>
                    <Select
                      value={customerInfo.device}
                      onValueChange={(value) => setCustomerInfo({...customerInfo, device: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz typ urządzenia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="desktop">Desktop PC</SelectItem>
                        <SelectItem value="macbook">MacBook</SelectItem>
                        <SelectItem value="imac">iMac</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                        <SelectItem value="phone">Smartphone</SelectItem>
                        <SelectItem value="other">Inne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Opis problemu</label>
                    <Textarea
                      value={customerInfo.description}
                      onChange={(e) => setCustomerInfo({...customerInfo, description: e.target.value})}
                      placeholder="Opisz problem z urządzeniem..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Podsumowanie rezerwacji:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Data:</strong> {availableDates.find(d => d.value === selectedDate)?.label}</p>
                    <p><strong>Godzina:</strong> {selectedSlot}</p>
                    <p><strong>Usługa:</strong> {serviceTypes.find(s => s.id === selectedService)?.name}</p>
                    <p><strong>Czas trwania:</strong> {serviceTypes.find(s => s.id === selectedService)?.duration} minut</p>
                    <p><strong>Cena:</strong> {serviceTypes.find(s => s.id === selectedService)?.price === 0 ? 'Darmowe' : `${serviceTypes.find(s => s.id === selectedService)?.price} PLN`}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    ← Cofnij
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!customerInfo.name || !customerInfo.email || !customerInfo.phone || isLoading}
                    className="min-w-[140px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rezerwuję...
                      </>
                    ) : (
                      'Potwierdź rezerwację'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingSystem;