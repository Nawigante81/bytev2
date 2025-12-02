
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import MetaTags from '@/components/MetaTags';
import SectionWrapper from '@/components/SectionWrapper';
import SectionTitle from '@/components/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LabLiveFeed from '@/components/LabLiveFeed';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight, Cpu, Zap, ShieldCheck, Server, Star, ChevronDown, Wrench, MapPin, Clock, Award, CheckCircle, Phone, Mail, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import DiagnosisModal from '@/components/DiagnosisModal';
import OrderModal from '@/components/OrderModal';
import { cn } from '@/lib/utils';
import NewsDashboard from '@/components/NewsDashboard';
import ReviewsCarousel from '@/components/ReviewsCarousel';

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  return prefersReducedMotion;
};

const Home = () => {
  const { toast } = useToast();
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isOfferExpanded, setIsOfferExpanded] = useState(false);
  const heroRef = useRef(null);
  const offerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    const isModalOpen = isDiagnosisModalOpen || isOrderModalOpen;
    if (isModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isDiagnosisModalOpen, isOrderModalOpen]);

  const handleOrderClick = (service) => {
    setSelectedService(service);
    setIsOrderModalOpen(true);
  };

  const handleOfferToggle = () => {
    setIsOfferExpanded(!isOfferExpanded);
    if (!isOfferExpanded) {
      setTimeout(() => {
        offerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const mainServices = [
    { icon: Wrench, title: "Naprawa laptopów i PC", description: "Diagnostyka, naprawa, wymiana podzespołów", price: "od 99 PLN", features: ["Diagnoza sprzętu", "Wymiana części", "Testy jakości"] },
    { icon: ShieldCheck, title: "Odzyskiwanie danych", description: "Profesjonalne odzyskiwanie z uszkodzonych nośników", price: "od 199 PLN", features: ["SSD i HDD", "Pendrive", "Karty pamięci"] },
    { icon: Zap, title: "Instalacje systemów", description: "Windows, Linux, macOS z pełną konfiguracją", price: "od 199 PLN", features: ["Sterowniki", "Oprogramowanie", "Optymalizacja"] },
    { icon: Server, title: "Serwery i sieci", description: "Konfiguracja, monitoring, backup dla firm", price: "od 299 PLN", features: ["Proxmox", "NAS", "Monitoring"] },
    { icon: Cpu, title: "Usługi IoT", description: "Projekty ESP32, Arduino, automatyka domowa", price: "wycena indywidualna", features: ["ESP32", "Arduino", "Projekty custom"] },
    { icon: Phone, title: "Urządzenia mobilne", description: "Naprawy telefonów, tabletów, wymiana ekranów", price: "wycena indywidualna", features: ["Baterie", "Ekrany", "Gniazda"] },
  ];

  const uspItems = [
    { icon: Zap, title: "Szybka diagnoza", description: "24-48h analiza problemu + kosztorys" },
    { icon: Award, title: "Certyfikowani specjaliści", description: "Microsoft, CompTIA, Cisco" },
    { icon: ShieldCheck, title: "Bezpieczeństwo danych", description: "RODO, kopie zapasowe, pełna poufność" },
    { icon: Users, title: "500+ zadowolonych klientów", description: "98% pozytywnych opinii" },
  ];

  const stats = [
    { number: "500+", label: "Naprawionych urządzeń" },
    { number: "5+", label: "Lat doświadczenia" },
    { number: "98%", label: "Zadowolonych klientów" },
    { number: "24h", label: "Średni czas diagnozy" },
  ];

  const certifications = [
    "Microsoft Certified Professional (MCP)",
    "CompTIA A+",
    "Cisco CCNA",
    "Zawodowe uprawnienia elektryczne"
  ];

  const pricingItems = [
    { slug: 'diag-pc', title: "Diagnoza Laptop/PC", price: "od 99 PLN" },
    { slug: 'czyszczenie-pasta', title: "Czyszczenie + Termopasta", price: "od 149 PLN" },
    { slug: 'system-reinstall', title: "Instalacja Systemu", price: "od 199 PLN" },
  ];

  const fullOfferItems = [
    { slug: 'diag-pc', title: "Diagnoza sprzętu (Laptop/PC)", price: "od 99 PLN", description: "Pełna analiza HW/SW, raport + kosztorys." },
    { slug: 'czyszczenie-pasta', title: "Czyszczenie układu chłodzenia + pasta/termopady", price: "od 149 PLN", description: "Rozbiórka, wymiana, test temperatur." },
    { slug: 'system-reinstall', title: "Instalacja / konfiguracja systemu", price: "od 199 PLN", description: "Windows/Linux/macOS, sterowniki, pakiet startowy." },
    { slug: 'optymalizacja', title: "Optymalizacja i usuwanie malware", price: "od 149 PLN", description: "Tuning, czyszczenie autostartu, zabezpieczenia." },
    { slug: 'networking', title: "Sieci i Wi-Fi (konfiguracja/naprawa)", price: "od 149 PLN", description: "Routery/AP, poprawa zasięgu i bezpieczeństwa." },
    { slug: 'mobile-service', title: "Serwis urządzeń mobilnych", price: "wycena indywidualna", description: "Diagnoza, baterie, ekrany, gniazda." },
    { slug: 'iot-electronics', title: "Elektronika / IoT (ESP32, Arduino)", price: "wycena indywidualna", description: "Czujniki, sterowniki, projekty custom." },
    { slug: 'servers-virtualization', title: "Serwery / wirtualizacja / backup", price: "od 299 PLN", description: "NAS, Proxmox, Docker, monitoring." },
    { slug: 'diag-online', title: "Diagnoza online (zdalna)", price: "99 PLN", description: "Szybkie wskazanie problemu + kosztorys." },
  ];

  const faqItems = [
    { q: "Ile trwa diagnoza?", a: "Zwykle 24-48 godzin, w zależności od złożoności problemu." },
    { q: "Czy jest gwarancja na usługi?", a: "Tak, udzielamy gwarancji na wykonaną usługę oraz na wymienione części." },
    { q: "Czy wykonujecie kopię zapasową danych?", a: "Tak, na życzenie klienta wykonujemy kopię zapasową danych, z zachowaniem pełnej poufności (RODO)." },
    { q: "Czy możliwy jest dojazd do klienta?", a: "Tak, na terenie miasta i najbliższych okolic. Warunki dojazdu ustalamy indywidualnie." },
    { q: "Jakie są formy płatności?", a: "Akceptujemy płatność gotówką, przelewem oraz BLIK." },
    { q: "Czy wystawiacie paragony?", a: "Tak, wystawiamy paragony." },
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <MetaTags
          title="ByteClinic - Strona Główna | Serwis komputerowy Zgorzelec"
          description="Profesjonalny serwis komputerowy w Zgorzelcu. Naprawa laptopów, PC, odzyskiwanie danych, instalacje systemów. 5+ lat doświadczenia, 500+ zadowolonych klientów."
          image="/og.png"
          url="https://www.byteclinic.pl/"
          type="website"
          canonical="https://www.byteclinic.pl/"
        />
        <link rel="preload" href="/images/glowne.webp" as="image" type="image/webp" />

        {/* Hero Section */}
        <header ref={heroRef} className="hero relative flex flex-col items-center justify-center text-center overflow-hidden min-h-[70vh] sm:min-h-[80vh] md:h-[100svh]">
          <motion.div 
            className="absolute inset-0 -z-10 hero-parallax"
            style={{ y: (!isMobile && !prefersReducedMotion) ? backgroundY : 0 }}
          >
            <img
              src="/images/glowne.webp"
              alt="Wnętrze komputera z podświetleniem RGB - serwis komputerowy ByteClinic w Zgorzelcu"
              decoding="async"
              fetchpriority="high"
              sizes="100vw"
              className="absolute inset-0 object-cover object-center w-full h-full pointer-events-none scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
            <div className="absolute inset-0 bg-primary/5 mix-blend-overlay"></div>
          </motion.div>
          
          <motion.div 
            className="relative z-10 pt-0 md:pt-0"
            style={{ y: 0 }}
          >
            <div className="mx-auto max-w-3xl bg-black/30 sm:bg-transparent rounded-xl p-4 sm:p-0">
              <motion.p 
                className="mb-3 text-sm uppercase tracking-widest text-primary/90"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                Serwis komputerowy i projekty ByteClinic
              </motion.p>
              <motion.h1 
                className="font-mono text-4xl md:text-7xl font-bold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-primary" style={{ textShadow: '0 0 8px hsl(var(--primary))' }}>ByteClinic</span>
                <span className="block text-2xl md:text-5xl text-secondary mt-2" style={{ textShadow: '0 0 6px hsl(var(--secondary))' }}>Serwis, który ogarnia temat.</span>
              </motion.h1>
              <motion.p 
                className="mt-4 md:mt-6 max-w-2xl mx-auto text-base md:text-xl text-foreground/90"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Profesjonalny serwis komputerowy w Zgorzelcu. Naprawa laptopów, PC, odzyskiwanie danych, instalacje systemów. 5+ lat doświadczenia, setki zadowolonych klientów.
              </motion.p>
              
              <motion.div 
                className="mt-4 flex flex-wrap justify-center items-center gap-4 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Pon-Pt: 9:00-17:00</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>500+ napraw</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  <span>98% zadowolonych</span>
                </div>
              </motion.div>
            </div>
                        
            <motion.div 
              className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-center items-center text-center gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button asChild size="lg" className="w-full sm:w-56">
                <Link to="/rezerwacja">📅 Umów wizytę</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-56">
                <Link to="/sledzenie">🔍 Śledź naprawę</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-56" onClick={() => setIsDiagnosisModalOpen(true)}>
                💻 Diagnoza online
              </Button>
            </motion.div>
          </motion.div>
        </header>

        {/* Stats Section */}
        <SectionWrapper className="py-12 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center bg-card/70 border-primary/20 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold font-mono text-primary mb-2">{stat.number}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </SectionWrapper>

        {/* Main Services Section */}
        <SectionWrapper className="py-12">
          <SectionTitle subtitle="Kompleksowe usługi IT dla klientów indywidualnych i firm.">Nasze usługi</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainServices.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full bg-card/80 border-primary/20 backdrop-blur-sm hover:border-primary hover:-translate-y-1 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <service.icon className="w-8 h-8 text-primary flex-shrink-0" />
                      <div>
                        <CardTitle className="font-mono text-lg">{service.title}</CardTitle>
                        <p className="font-mono text-lg font-bold text-primary">{service.price}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground mb-4">{service.description}</p>
                    <ul className="space-y-1">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild size="lg">
              <Link to="/uslugi">Zobacz wszystkie usługi</Link>
            </Button>
          </div>
        </SectionWrapper>

        {/* USP Section */}
        <SectionWrapper className="py-12 bg-muted/30">
          <SectionTitle subtitle="To nas wyróżnia na tle konkurencji.">Dlaczego ByteClinic?</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {uspItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center bg-card/70 border-primary/20 backdrop-blur-sm h-full">
                  <CardHeader>
                    <item.icon className="w-12 h-12 text-primary mx-auto mb-2" />
                    <CardTitle className="font-mono text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </SectionWrapper>

        {/* About Preview Section */}
        <SectionWrapper className="py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <SectionTitle subtitle="Poznaj naszą historię i doświadczenie.">O ByteClinic</SectionTitle>
              <div className="space-y-4">
                <p>
                  ByteClinic to lokalny serwis komputerowy z siedzibą w Zgorzelcu. Specjalizujemy się 
                  w naprawie laptopów, PC, diagnostyce sprzętu oraz kompleksowym wsparciu IT dla firm 
                  i klientów indywidualnych.
                </p>
                <p>
                  Z ponad 5-letnim doświadczeniem i setkami zadowolonych klientów, oferujemy 
                  profesjonalne usługi z pełną gwarancją. Nasz zespół to certyfikowani specjaliści 
                  Microsoft, CompTIA i Cisco.
                </p>
              </div>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/o-nas">Dowiedz się więcej</Link>
                </Button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <img
                src="/images/glowne.webp"
                alt="Profesjonalny serwis komputerowy ByteClinic w Zgorzelcu"
                className="w-full rounded-xl shadow-2xl border border-primary/20"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            </motion.div>
          </div>
        </SectionWrapper>

        {/* Certifications Section */}
        <SectionWrapper className="py-12 bg-muted/30">
          <SectionTitle subtitle="Uznane certyfikaty i uprawnienia.">Nasze kwalifikacje</SectionTitle>
          
          <Card className="max-w-4xl mx-auto bg-card/70 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certifications.map((cert, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-primary/10"
                  >
                    <Award className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{cert}</span>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Ciągle się rozwijamy i zdobywamy nowe kwalifikacje, aby oferować Państwu 
                  najlepsze usługi na rynku.
                </p>
              </div>
            </CardContent>
          </Card>
        </SectionWrapper>

        {/* Pricing Preview Section */}
        <SectionWrapper id="oferta">
          <div ref={offerRef} className="sr-only" aria-hidden="true" />
          <SectionTitle subtitle="Najpopularniejsze pozycje.">Skrót cennika</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {pricingItems.slice(0,3).map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <Card className="bg-card/70 border-primary/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-mono text-lg text-primary">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="font-mono font-bold text-secondary">{item.price}</span>
                    <Button variant="outline" size="sm" onClick={() => handleOrderClick(item)}>Zamów</Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Button asChild size="lg" className="w-full max-w-4xl mx-auto">
              <Link to="/cennik">Zobacz pełny cennik</Link>
            </Button>
          </div>

          <AnimatePresence>
            {isOfferExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: '2rem' }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {fullOfferItems.map((item, index) => (
                    <Card key={index} className="bg-card/80 border-primary/20 backdrop-blur-sm flex flex-col">
                      <CardHeader>
                        <CardTitle className="font-mono text-xl text-primary">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-muted-foreground">{item.description}</p>
                      </CardContent>
                      <div className="p-6 pt-0 flex justify-between items-end">
                        <p className="font-mono text-lg font-bold text-secondary">{item.price}</p>
                        <Button variant="outline" size="sm" onClick={() => handleOrderClick(item)}>Zamów <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="text-center text-muted-foreground text-sm mt-8 max-w-4xl mx-auto">
                  <p>Wystawiamy paragony lub na życzenie faktury VAT. Czas realizacji to zwykle 24-48h. Wszystkie dane są chronione zgodnie z RODO.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        <AnimatePresence>
          {isOfferExpanded && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-3 border-t border-primary/20 z-40 flex gap-4"
            >
              <Button asChild size="lg" className="w-full">
                <Link to="/kontakt"><Wrench className="mr-2 h-5 w-5" /> Kontakt z serwisem</Link>
              </Button>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => setIsDiagnosisModalOpen(true)}>
                Diagnoza online
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        </SectionWrapper>

        {/* Lab Live Feed */}
        <SectionWrapper className="py-8 md:py-12">
          <LabLiveFeed />
        </SectionWrapper>

        {/* IT News */}
        <SectionWrapper className="py-8 md:py-12">
          <SectionTitle>IT / Cyber News</SectionTitle>
          <NewsDashboard />
        </SectionWrapper>

        {/* Reviews Section */}
        <SectionWrapper>
          <SectionTitle subtitle="Co mówią klienci, którzy ogarnęli temat.">Opinie klientów</SectionTitle>
          <ReviewsCarousel />
        </SectionWrapper>

        {/* FAQ Section */}
        <SectionWrapper id="faq">
          <SectionTitle>Najczęściej zadawane pytania</SectionTitle>
          <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto bg-card/50 p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
            {faqItems.map((item, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SectionWrapper>
      </motion.div>
      
      <DiagnosisModal isOpen={isDiagnosisModalOpen} setIsOpen={setIsDiagnosisModalOpen} />
      <OrderModal isOpen={isOrderModalOpen} setIsOpen={setIsOrderModalOpen} service={selectedService} />
    </>
  );
};

export default Home;
