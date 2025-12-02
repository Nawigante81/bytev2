
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import SectionWrapper from '@/components/SectionWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Wrench, Wind, HardDrive, Database, Rocket, Wifi, Cpu, 
  Monitor, Smartphone, Server, Shield, Zap, Settings,
  Award, Clock, CheckCircle, ArrowRight, Phone, Mail
} from 'lucide-react';
import OrderModal from '@/components/OrderModal';

const ServiceCard = ({ service, index, onOrderClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="bg-card/80 border-primary/20 backdrop-blur-sm h-full flex flex-col hover:border-primary hover:-translate-y-1 transition-all duration-300 overflow-hidden">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <service.icon className="w-8 h-8 text-primary flex-shrink-0" />
            </div>
            <div className="flex-grow">
              <CardTitle className="font-mono text-xl mb-2">{service.title}</CardTitle>
              <Badge variant="secondary" className="mb-2">{service.category}</Badge>
              <p className="font-mono text-lg font-bold text-primary">{service.price}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-muted-foreground mb-4">{service.description}</p>
          
          <h4 className="font-semibold mb-3 text-sm">Zakres usług:</h4>
          <ul className="space-y-2">
            {service.details.scope.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-primary/10 mt-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Czas realizacji:</span>
            <span className="font-semibold text-sm">{service.details.eta}</span>
          </div>
          <Button onClick={() => onOrderClick(service)} size="sm" className="w-full sm:w-auto">
            Zamów usługę
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const Services = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const handleOrderClick = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const services = [
    {
      slug: 'diag-pc', 
      icon: Wrench, 
      title: "Diagnoza laptop/PC", 
      price: "od 99 PLN", 
      category: "Diagnostyka",
      description: "Dokładna analiza problemu sprzętowego lub software'owego z raportem technicznym.",
      details: { 
        scope: [
          "Testy komponentów (CPU, RAM, dysk, płyta)",
          "Analiza logów systemowych",
          "Testy temperatur i wydajności",
          "Raport techniczny z kosztorysem",
          "Opcjonalna wycena naprawy"
        ], 
        eta: "24-48h" 
      } 
    },
    {
      slug: 'diag-online', 
      icon: Monitor, 
      title: "Diagnoza online", 
      price: "99 PLN", 
      category: "Diagnostyka",
      description: "Zdalna analiza problemu przez TeamViewer lub AnyDesk - szybko i wygodnie.",
      details: { 
        scope: [
          "Analiza problemu zdalnie",
          "Sprawdzenie systemu i programów",
          "Wskazanie rozwiązania krok po kroku",
          "Raport mailowy z instrukcjami",
          "Wsparcie przy implementacji"
        ], 
        eta: "1-2h" 
      } 
    },
    {
      slug: 'czyszczenie-pasta', 
      icon: Wind, 
      title: "Czyszczenie + termopasta", 
      price: "od 149 PLN", 
      category: "Konserwacja",
      description: "Pełne czyszczenie wnętrza laptopa/PC i wymiana past termoprzewodzących.",
      details: { 
        scope: [
          "Demontaż układu chłodzenia",
          "Czyszczenie z kurzu i zabrudzeń",
          "Wymiana pasty termoprzewodzącej",
          "Sprawdzenie stanu wentylatorów",
          "Testy temperatur po serwisie"
        ], 
        eta: "do 24h" 
      } 
    },
    {
      slug: 'system-reinstall', 
      icon: HardDrive, 
      title: "Instalacja/konfiguracja systemu", 
      price: "od 199 PLN", 
      category: "System",
      description: "Profesjonalna instalacja Windows/Linux z pełną konfiguracją i optymalizacją.",
      details: { 
        scope: [
          "Instalacja systemu z nośnika",
          "Aktualizacja wszystkich sterowników",
          "Instalacja pakietu startowego",
          "Konfiguracja bezpieczeństwa",
          "Optymalizacja wydajności"
        ], 
        eta: "do 24h" 
      } 
    },
    {
      slug: 'data-recovery', 
      icon: Database, 
      title: "Odzysk danych", 
      price: "od 199 PLN", 
      category: "Dane",
      description: "Profesjonalne odzyskiwanie danych z uszkodzonych nośników i systemów plików.",
      details: { 
        scope: [
          "Analiza nośnika (SSD, HDD, pendrive)",
          "Próba odzyskania programowego",
          "Ocena możliwości odzysku",
          "Raport o stanie nośnika",
          "Doradztwo w dalszych krokach"
        ], 
        eta: "48-72h" 
      } 
    },
    {
      slug: 'optymalizacja', 
      icon: Rocket, 
      title: "Optymalizacja i przyspieszenie", 
      price: "od 149 PLN", 
      category: "Optymalizacja",
      description: "Tuning systemu, czyszczenie i przyspieszenie działania komputera.",
      details: { 
        scope: [
          "Czyszczenie autostartu",
          "Defragmentacja/optymalizacja SSD",
          "Usunięcie zbędnego oprogramowania",
          "Aktualizacja sterowników i systemu",
          "Konfiguracja ustawień wydajności"
        ], 
        eta: "do 24h" 
      } 
    },
    {
      slug: 'networking', 
      icon: Wifi, 
      title: "Sieci/Wi-Fi, konfiguracja routera", 
      price: "od 149 PLN", 
      category: "Sieci",
      description: "Profesjonalna konfiguracja sieci domowej i poprawa zasięgu Wi-Fi.",
      details: { 
        scope: [
          "Konfiguracja routera (WAN, LAN, Wi-Fi)",
          "Zabezpieczenie sieci (WPA3, sieć gościnna)",
          "Analiza i optymalizacja zasięgu",
          "Konfiguracja QOS i portów",
          "Testy prędkości i stabilności"
        ], 
        eta: "1-2h" 
      } 
    },
    {
      slug: 'serwery-virtualizacja', 
      icon: Server, 
      title: "Serwery / wirtualizacja / backup", 
      price: "od 299 PLN", 
      category: "Serwery",
      description: "Profesjonalne rozwiązania serwerowe, wirtualizacja i systemy backup dla firm.",
      details: { 
        scope: [
          "Konfiguracja Proxmox/NAS",
          "Setup Docker i kontenery",
          "Systemy backup i monitoring",
          "Konfiguracja VPN i zdalnego dostępu",
          "Optymalizacja wydajności serwerów"
        ], 
        eta: "1-3 dni" 
      } 
    },
    {
      slug: 'elektronika-iot', 
      icon: Cpu, 
      title: "Elektronika / IoT (ESP32, Arduino)", 
      price: "wycena indywidualna", 
      category: "IoT",
      description: "Projekty IoT, automatyka domowa, programowanie mikrokontrolerów.",
      details: { 
        scope: [
          "Projekty na ESP32 i Arduino",
          "Czujniki i sterowniki",
          "Integracja z systemami smart home",
          "Programowanie i debugowanie",
          "Montaż i konfiguracja hardware"
        ], 
        eta: "wycena indywidualna" 
      } 
    },
    {
      slug: 'mobile-service', 
      icon: Smartphone, 
      title: "Serwis urządzeń mobilnych", 
      price: "wycena indywidualna", 
      category: "Mobilne",
      description: "Naprawy smartfonów i tabletów - wymiana ekranów, baterii, naprawy płyty.",
      details: { 
        scope: [
          "Diagnoza problemów mobilnych",
          "Wymiana ekranów i digitizerów",
          "Wymiana baterii i gniazd",
          "Naprawy po zalaniu",
          "Odinstalowanie blokad i kont"
        ], 
        eta: "wycena indywidualna" 
      } 
    },
    {
      slug: 'cyber-bezpieczenstwo', 
      icon: Shield, 
      title: "Cyber bezpieczeństwo", 
      price: "od 199 PLN", 
      category: "Bezpieczeństwo",
      description: "Audyt bezpieczeństwa, konfiguracja zabezpieczeń i ochrona przed malware.",
      details: { 
        scope: [
          "Skan antywirusowy i malware",
          "Konfiguracja firewall",
          "Aktualizacja zabezpieczeń",
          "Kopie zapasowe ważnych danych",
          "Szkolenie z podstaw cyber hygiene"
        ], 
        eta: "1-2 dni" 
      } 
    },
    {
      slug: 'upgrade-montaz', 
      icon: Settings, 
      title: "Montaż / Upgrade komputera", 
      price: "od 199 PLN", 
      category: "Hardware",
      description: "Profesjonalny montaż nowego PC lub modernizacja istniejącego sprzętu.",
      details: { 
        scope: [
          "Montaż kompletnego PC",
          "Dobór kompatybilnych części",
          "Okablowanie i testy stabilności",
          "Konfiguracja BIOS/UEFI",
          "Optymalizacja wydajności"
        ], 
        eta: "1-2 dni" 
      } 
    }
  ];

  const serviceCategories = [
    "Wszystkie",
    "Diagnostyka", 
    "Konserwacja", 
    "System", 
    "Dane", 
    "Optymalizacja", 
    "Sieci", 
    "Serwery", 
    "IoT", 
    "Mobilne", 
    "Bezpieczeństwo", 
    "Hardware"
  ];

  const [selectedCategory, setSelectedCategory] = useState("Wszystkie");

  const filteredServices = selectedCategory === "Wszystkie" 
    ? services 
    : services.filter(service => service.category === selectedCategory);

  const faqItems = [
    { q: "Ile trwa diagnoza?", a: "Standardowa diagnoza trwa 24-48h, diagnoza online 1-2h. W pilnych przypadkach możliwa express w ciągu kilku godzin." },
    { q: "Czy jest gwarancja na usługi?", a: "Tak, udzielamy gwarancji na wykonaną usługę oraz na wymienione części. Standardowo 3 miesiące na pracę, 12 miesięcy na części." },
    { q: "Czy wykonujecie kopię zapasową danych?", a: "Tak, na życzenie klienta wykonujemy kopię zapasową danych przed naprawą, z zachowaniem pełnej poufności (RODO)." },
    { q: "Czy możliwy jest dojazd do klienta?", a: "Tak, obsługujemy Zgorzelec i okolice (promień ~20km). Dojazd płatny dodatkowo - 49 PLN w mieście, 99 PLN poza miastem." },
    { q: "Jakie są formy płatności?", a: "Akceptujemy płatność gotówką, przelewem bankowym oraz BLIK. Dla firm możliwość wystawienia faktury VAT." },
    { q: "Czy wystawiacie paragony?", a: "Tak, wystawiamy paragony fiskalne. Na życzenie wystawiamy faktury VAT dla firm." },
    { q: "Co w przypadku nieopłacalnej naprawy?", a: "W przypadku gdy koszt naprawy przekracza 60% wartości urządzenia, informujemy o tym klienta i możemy zaoferować odkupienie sprzętu na części." },
    { q: "Czy pracujecie z urządzeniami firmowymi?", a: "Tak, mamy doświadczenie w obsłudze sprzętu firmowego, zachowujemy pełną poufność danych zgodnie z RODO." }
  ];

  return (
    <PageTransition>
      <Helmet>
        <title>Usługi - ByteClinic</title>
        <meta name="description" content="Pełna oferta usług serwisowych ByteClinic. Diagnoza, naprawa, optymalizacja, odzyskiwanie danych, sieci, serwery. Profesjonalny serwis w Zgorzelcu." />
      </Helmet>

      {/* Hero Section */}
      <SectionWrapper className="py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-primary">Usługi</span> ByteClinic
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Kompleksowe usługi IT dla klientów indywidualnych i firm. Od prostej diagnozy 
            po zaawansowane projekty serwerowe i IoT.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Badge variant="secondary" className="p-2">
              <Award className="w-4 h-4 mr-1" />
              Certyfikowani specjaliści
            </Badge>
            <Badge variant="secondary" className="p-2">
              <Clock className="w-4 h-4 mr-1" />
              Szybka realizacja
            </Badge>
            <Badge variant="secondary" className="p-2">
              <Shield className="w-4 h-4 mr-1" />
              Pełna gwarancja
            </Badge>
          </div>
        </div>
      </SectionWrapper>

      {/* Category Filter */}
      <SectionWrapper className="py-6">
        <div className="flex flex-wrap justify-center gap-2">
          {serviceCategories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="mb-2"
            >
              {category}
            </Button>
          ))}
        </div>
      </SectionWrapper>

      {/* Services Grid */}
      <SectionWrapper className="pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((service, index) => (
            <ServiceCard 
              service={service} 
              index={index} 
              key={service.slug} 
              onOrderClick={handleOrderClick} 
            />
          ))}
        </div>
      </SectionWrapper>

      {/* Contact CTA */}
      <SectionWrapper className="py-12 bg-muted/30">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold font-mono mb-4">
              Nie znalazłeś tego, czego szukasz?
            </h3>
            <p className="text-muted-foreground mb-6">
              Skontaktuj się z nami - wyceniamy każdy projekt indywidualnie. 
              Specjalizujemy się również w nietypowych zleceniach IT.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/kontakt">Opisz swój problem</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="tel:+48724316523">
                  <Phone className="w-4 h-4 mr-2" />
                  Zadzwoń: +48 724 316 523
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </SectionWrapper>

      {/* FAQ Section */}
      <SectionWrapper className="pb-8">
        <SectionTitle subtitle="Odpowiedzi na najczęściej zadawane pytania.">FAQ</SectionTitle>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto bg-card/50 p-4 rounded-lg border-primary/20 backdrop-blur-sm">
          {faqItems.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="text-center mt-12">
          <Button asChild size="lg" variant="secondary">
            <Link to="/kontakt">Masz inne pytanie? Napisz do nas</Link>
          </Button>
        </div>
      </SectionWrapper>
      
      {selectedService && (
        <OrderModal 
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          service={selectedService}
        />
      )}
    </PageTransition>
  );
};

export default Services;
