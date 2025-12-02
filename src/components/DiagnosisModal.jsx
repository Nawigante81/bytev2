
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Send, Laptop, PcCase, Smartphone, Router, Cpu, CheckCircle, FileDown, Tablet, HardDrive, Wifi, Battery, Power, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import jsPDF from 'jspdf';

const steps = [
  { id: 1, title: 'Sprzęt' },
  { id: 2, title: 'Objawy' },
  { id: 3, title: 'Opis' },
  { id: 4, title: 'Kontakt' },
  { id: 5, title: 'Potwierdzenie' },
];

const deviceTypes = [
  { value: 'Laptop', label: 'Laptop', icon: Laptop },
  { value: 'PC', label: 'Komputer PC', icon: PcCase },
  { value: 'Smartfon', label: 'Smartfon', icon: Smartphone },
  { value: 'Tablet', label: 'Tablet', icon: Tablet },
  { value: 'Sieć/Router', label: 'Sieć / Router', icon: Router },
  { value: 'Dysk/Pamięć', label: 'Dysk / Pamięć', icon: HardDrive },
  { value: 'IoT/ESP32', label: 'Urządzenie IoT', icon: Cpu },
  { value: 'Inne', label: 'Inne', icon: AlertTriangle },
];

const symptomsList = [
    { value: 'nie włącza się', label: 'Nie włącza się', icon: Power },
    { value: 'przegrzewa się', label: 'Przegrzewa się', icon: AlertTriangle },
    { value: 'wolno działa', label: 'Wolno działa', icon: AlertTriangle },
    { value: 'hałasuje', label: 'Głośno pracuje / hałasuje', icon: AlertTriangle },
    { value: 'brak obrazu', label: 'Brak obrazu', icon: AlertTriangle },
    { value: 'BSOD / restarty', label: 'BSOD / Nagłe restarty', icon: AlertTriangle },
    { value: 'problem z baterią', label: 'Problem z baterią / ładowaniem', icon: Battery },
    { value: 'problem z Wi-Fi', label: 'Problem z Wi-Fi / siecią', icon: Wifi },
    { value: 'zalanie', label: 'Zalanie cieczą', icon: AlertTriangle },
    { value: 'uszkodzenie mechaniczne', label: 'Uszkodzenie mechaniczne', icon: AlertTriangle },
];

const DiagnosisModal = ({ isOpen, setIsOpen }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    device: '',
    symptoms: [],
    message: '',
    name: '',
    email: '',
    phone: '',
    consent: false,
  });
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (user) {
            setFormData(prev => ({ ...prev, email: user.email || '', name: user.user_metadata?.display_name || '' }));
        }
    }
  }, [user, isOpen]);

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep === 4) {
        handleSubmit();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => setCurrentStep(prev => prev - 1);

  const validateStep = () => {
    switch (currentStep) {
      case 3:
        if (!formData.message.trim()) {
          toast({ variant: 'destructive', title: 'Opis problemu jest wymagany.' });
          return false;
        }
        break;
      case 4:
        if (!formData.name.trim()) {
          toast({ variant: 'destructive', title: 'Imię jest wymagane.' });
          return false;
        }
        if (!formData.email.trim()) {
          toast({ variant: 'destructive', title: 'Adres e-mail jest wymagany.' });
          return false;
        }
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
          toast({ variant: 'destructive', title: 'Nieprawidłowy format adresu e-mail.' });
          return false;
        }
        if (!formData.consent) {
          toast({ variant: 'destructive', title: 'Zgoda na przetwarzanie danych jest wymagana.' });
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);

    const fullMessage = `Wybrane objawy: ${formData.symptoms.join(', ') || 'brak'}.\n\nOpis klienta:\n${formData.message}`;

    const requestData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      message: fullMessage,
      device: formData.device || 'Nieokreślone',
      consent: formData.consent,
      user_id: user?.id || null,
      source_url: window.location.href,
      user_agent: navigator.userAgent,
      status: 'new',
    };

    const { error } = await supabase.from('diagnosis_requests').insert([requestData]);
    setIsSubmitting(false);

    if (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Błąd zapisu zgłoszenia!', 
        description: `Szczegóły: ${error.message}${error.details ? ` (${error.details})` : ''}` 
      });
      return;
    }

    toast({ variant: 'success', title: 'Dziękujemy!', description: 'Zgłoszenie zostało zapisane.' });
    setSubmissionSuccess(true);
    setCurrentStep(5);
  };

  const handleSymptomToggle = (symptom) => {
    setFormData(prev => {
      const newSymptoms = prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom];
      return { ...prev, symptoms: newSymptoms };
    });
  };

  const saveAsPdf = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.text('Szkic zgłoszenia diagnozy - ByteClinic', 14, 22);
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Urządzenie: ${formData.device || 'Nie wybrano'}`, 14, 32);
    doc.text(`Objawy: ${formData.symptoms.join(', ') || 'Nie wybrano'}`, 14, 42);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Opis problemu:', 14, 52);
    doc.setFont('Helvetica', 'normal');
    const splitContent = doc.splitTextToSize(formData.message || 'Brak opisu.', 180);
    doc.text(splitContent, 14, 62);

    doc.save(`szkic_diagnozy_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: 'Szkic zapisany jako PDF!' });
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      device: '',
      symptoms: [],
      message: '',
      name: user?.user_metadata?.display_name || '',
      email: user?.email || '',
      phone: '',
      consent: false,
    });
    setSubmissionSuccess(false);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      resetForm();
    }
    setIsOpen(open);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Jaki sprzęt wymaga interwencji?</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {deviceTypes.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setFormData({ ...formData, device: value })} className={cn("p-4 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all", formData.device === value ? 'border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary))]' : 'border-border hover:border-primary/50 hover:bg-primary/5')}>
                  <Icon className="w-8 h-8 text-primary" />
                  <span className="text-sm text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Jakie są objawy? (można wybrać kilka)</h3>
                <div className="grid grid-cols-2 gap-3">
                    {symptomsList.map(({ value, label, icon: Icon }) => (
                        <button key={value} onClick={() => handleSymptomToggle(value)} className={cn("p-3 border rounded-lg flex items-center gap-3 transition-all text-left", formData.symptoms.includes(value) ? 'border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary))]' : 'border-border hover:border-primary/50 hover:bg-primary/5')}>
                            <Icon className="w-6 h-6 text-primary flex-shrink-0" />
                            <span className="text-sm">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Opisz problem szerzej *</h3>
            <div className="space-y-2">
              <Label htmlFor="message">Jeśli żaden z objawów nie pasuje lub chcesz dodać więcej informacji, opisz to tutaj.</Label>
              <Textarea id="message" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} rows={6} required />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dane kontaktowe</h3>
            <div className="space-y-2"><Label htmlFor="name">Imię *</Label><Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="email">E-mail *</Label><Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="phone">Telefon (opcjonalnie)</Label><Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-4 pt-4">
              <div className="flex items-start space-x-2"><Checkbox id="consent" checked={formData.consent} onCheckedChange={checked => setFormData({ ...formData, consent: checked })} /><Label htmlFor="consent" className="text-xs">Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zgłoszenia. *</Label></div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="text-center"><motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /></motion.div><h3 className="text-xl font-bold text-primary">Dziękujemy, zgłoszenie zostało zapisane!</h3><p className="text-muted-foreground mt-2 mb-6">Skontaktujemy się z Tobą najszybciej jak to możliwe.</p></div>
        );
      default: return null;
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[625px] bg-background/80 backdrop-blur-sm border-primary/20 flex flex-col p-0 max-h-[95svh] h-auto">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="font-mono text-2xl text-center text-primary">{submissionSuccess ? 'Zgłoszenie Wysłane' : 'Zgłoszenie Diagnozy Online'}</DialogTitle>
          <DialogDescription className="text-center">{submissionSuccess ? 'Dziękujemy za kontakt!' : 'Opisz problem, a my się nim zajmiemy.'}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-4 flex-shrink-0">
          <div className="w-full bg-muted rounded-full h-2.5"><motion.div className="bg-primary h-2.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} /></div>
          <div className="flex justify-between text-xs mt-1 text-muted-foreground">
            {steps.map(step => (<span key={step.id} className={cn(step.id <= currentStep && 'text-primary font-bold')}>{step.title}</span>))}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.3 }}>
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="p-3 bg-black/75 backdrop-blur-sm border-t border-primary/25 flex-shrink-0">
          {!submissionSuccess ? (
            <div className="flex justify-between items-center w-full gap-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}><ArrowLeft className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Wstecz</span></Button>
                <Button variant="ghost" size="icon" onClick={saveAsPdf} disabled={isSubmitting}><FileDown className="w-4 h-4" /></Button>
              </div>
              <Button onClick={handleNext} disabled={isSubmitting} className="flex-grow min-h-[48px]">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {currentStep === 4 ? (<><Send className="w-4 h-4 mr-2" /> Wyślij</>) : (<>Dalej <ArrowRight className="w-4 h-4 ml-2" /></>)}
              </Button>
            </div>
          ) : (
            <Button onClick={() => handleOpenChange(false)} className="w-full min-h-[48px]">Zamknij</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiagnosisModal;
