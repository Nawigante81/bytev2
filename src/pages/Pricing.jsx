
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import SectionWrapper from '@/components/SectionWrapper';
import SectionTitle from '@/components/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Clock, Star, CheckCircle, AlertCircle, Phone, Mail, 
  Calculator, Shield, Award, Info, ArrowRight, MapPin 
} from 'lucide-react';

const Pricing = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [contactService, setContactService] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const nameRef = useRef(null);

  useEffect(() => {
    if (contactOpen) {
      const t = setTimeout(() => nameRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [contactOpen]);

  const openContact = (service) => {
    setContactService(service);
    setContactOpen(true);
  };

  const priceRows = [
    {
      section: 'Diagnostyka i analiza',
      icon: '🔍',
      color: 'border-blue-500/20 bg-blue-500/5',
      items: [
        { name: 'Diagnoza sprzętu (Laptop/PC)', price: 'od 99 PLN', time: '24–48 h', note: 'Raport + kosztorys', popular: true },
        { name: 'Diagnoza online (zdalna)', price: '99 PLN', time: '1–2 h', note: 'Szybkie wskazanie problemu' },
        { name: 'Test obciążeniowy (stress test)', price: 'od 79 PLN', time: '2–4 h', note: 'CPU/GPU/RAM pod pełnym obciążeniem' },
        { name: 'Analiza danych (audyt)', price: 'od 149 PLN', time: '1–2 dni', note: 'Audyt bezpieczeństwa i wydajności' },
      ],
    },
    {
      section: 'Serwis komputerowy',
      icon: '🔧',
      color: 'border-green-500/20 bg-green-500/5',
      items: [
        { name: 'Czyszczenie układu chłodzenia + pasta/termopady', price: 'od 149 PLN', time: '1–2 dni', note: 'Testy temperatur po serwisie', popular: true },
        { name: 'Instalacja / konfiguracja systemu', price: 'od 199 PLN', time: '1 dzień', note: 'Windows / Linux / macOS', popular: true },
        { name: 'Wymiana dysku / pamięci RAM', price: 'od 99 PLN', time: '1 dzień', note: 'Klonowanie danych opcjonalnie' },
        { name: 'Wymiana matrycy / klawiatury laptopa', price: 'od 149 PLN', time: '1–3 dni', note: 'Części + robocizna' },
        { name: 'Naprawa płyty głównej', price: 'wycena indywidualna', time: '2–5 dni', note: 'Po diagnozie płyty' },
      ],
    },
    {
      section: 'Montaż i modernizacja',
      icon: '⚡',
      color: 'border-purple-500/20 bg-purple-500/5',
      items: [
        { name: 'Montaż komputera / okablowania', price: 'od 199 PLN', time: '1–2 dni', note: 'Konfiguracja BIOS/UEFI' },
        { name: 'Konfiguracja chłodzenia / pasty / undervolt', price: 'od 149 PLN', time: '1 dzień', note: 'Profil wydajność/cisza' },
        { name: 'Modernizacja (upgrade)', price: 'od 99 PLN', time: '1 dzień', note: 'Dobór kompatybilnych części' },
        { name: 'Setup Gaming PC', price: 'od 299 PLN', time: '1–2 dni', note: 'Optymalizacja pod gry' },
      ],
    },
    {
      section: 'Odzyskiwanie danych',
      icon: '💾',
      color: 'border-orange-500/20 bg-orange-500/5',
      items: [
        { name: 'Odzyskiwanie danych (wstępna analiza)', price: 'od 199 PLN', time: '48–72 h', note: 'Ocena możliwości odzysku' },
        { name: 'Odzyskiwanie z SSD', price: 'od 299 PLN', time: '2–5 dni', note: 'Programowe i sprzętowe' },
        { name: 'Odzyskiwanie z HDD', price: 'od 249 PLN', time: '2–4 dni', note: 'Wymiana głowic/lustra' },
        { name: 'Odzyskiwanie z RAID', price: 'od 399 PLN', time: '3–7 dni', note: 'Złożone konfiguracje' },
      ],
    },
    {
      section: 'Usługi sieciowe',
      icon: '📶',
      color: 'border-cyan-500/20 bg-cyan-500/5',
      items: [
        { name: 'Konfiguracja Wi‑Fi / routera / mesh', price: 'od 149 PLN', time: '1 dzień', note: 'Optymalizacja zasięgu i bezpieczeństwa' },
        { name: 'Sieć przewodowa / ethernet', price: 'od 199 PLN', time: '1–2 dni', note: 'Okablowanie i konfiguracja' },
        { name: 'Konfiguracja VPN', price: 'od 199 PLN', time: '1 dzień', note: 'Bezpieczny zdalny dostęp' },
        { name: 'Rozdzielacz internetu (multiWAN)', price: 'od 249 PLN', time: '1–2 dni', note: 'Redundancja połączenia' },
      ],
    },
    {
      section: 'Serwery i wirtualizacja',
      icon: '🖥️',
      color: 'border-yellow-500/20 bg-yellow-500/5',
      items: [
        { name: 'Proxmox / NAS / Backup', price: 'od 299 PLN', time: '1–3 dni', note: 'Monitoring i kopie zapasowe' },
        { name: 'Setup Docker / kontenery', price: 'od 249 PLN', time: '1–2 dni', note: 'Automatyzacja aplikacji' },
        { name: 'Monitoring serwerów', price: 'od 199 PLN', time: '1 dzień', note: 'Alerty i dashboard' },
        { name: 'Backup dla firm', price: 'od 399 PLN', time: '2–3 dni', note: 'Profesjonalne rozwiązania' },
      ],
    },
    {
      section: 'IoT i automatyka',
      icon: '🤖',
      color: 'border-pink-500/20 bg-pink-500/5',
      items: [
        { name: 'ESP32 project setup', price: 'wycena indywidualna', time: '3–7 dni', note: 'Projekty customowe' },
        { name: 'Arduino / Raspberry Pi', price: 'wycena indywidualna', time: '2–5 dni', note: 'Prototyp i programowanie' },
        { name: 'Smart Home integration', price: 'od 399 PLN', time: '3–7 dni', note: 'Home Assistant, Node-RED' },
        { name: 'Automatyka przemysłowa', price: 'wycena indywidualna', time: '5–14 dni', note: 'Systemy SCADA' },
      ],
    },
    {
      section: 'Bezpieczeństwo',
      icon: '🛡️',
      color: 'border-red-500/20 bg-red-500/5',
      items: [
        { name: 'Skan antywirusowy + malware removal', price: 'od 149 PLN', time: '1–2 dni', note: 'Pełne czyszczenie systemu' },
        { name: 'Backup danych', price: 'od 199 PLN', time: '1 dzień', note: 'Automatyczne kopie' },
        { name: 'Konfiguracja firewall', price: 'od 149 PLN', time: '1 dzień', note: 'Zabezpieczenie sieci' },
        { name: 'Penetration testing (audyt)', price: 'od 399 PLN', time: '2–3 dni', note: 'Test bezpieczeństwa' },
      ],
    },
    {
      section: 'Usługi dodatkowe',
      icon: '➕',
      color: 'border-indigo-500/20 bg-indigo-500/5',
      items: [
        { name: 'Dojazd na terenie miasta', price: 'od 49 PLN', time: '—', note: 'Zgorzelec i okolice' },
        { name: 'Dojazd poza miasto', price: 'od 99 PLN', time: '—', note: 'Ustalane indywidualnie' },
        { name: 'Ekspresowa diagnoza (2-4h)', price: 'dopłata 50 PLN', time: '2–4 h', note: 'Pilne przypadki' },
        { name: 'Konsultacje telefoniczne', price: '29 PLN/30 min', time: '30 min', note: 'Wsparcie eksperckie' },
      ],
    },
  ];

  const categories = ['Wszystkie', 'Diagnostyka', 'Serwis', 'Montaż', 'Dane', 'Sieć', 'Serwery', 'IoT', 'Bezpieczeństwo', 'Dodatkowe'];

  const filteredRows = selectedCategory === 'Wszystkie' 
    ? priceRows 
    : priceRows.filter(row => {
        const categoryMap = {
          'Diagnostyka': 'Diagnostyka i analiza',
          'Serwis': 'Serwis komputerowy',
          'Montaż': 'Montaż i modernizacja',
          'Dane': 'Odzyskiwanie danych',
          'Sieć': 'Usługi sieciowe',
          'Serwery': 'Serwery i wirtualizacja',
          'IoT': 'IoT i automatyka',
          'Bezpieczeństwo': 'Bezpieczeństwo',
          'Dodatkowe': 'Usługi dodatkowe'
        };
        return row.section === categoryMap[selectedCategory];
      });

  const handleQuickQuote = () => {
    setContactService('Wycena indywidualna');
    setContactOpen(true);
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Cennik — ByteClinic</title>
        <meta name="description" content="Cennik usług serwisu ByteClinic: diagnoza, naprawa, odzyskiwanie danych, sieci, serwery. Ceny brutto — ostateczna wycena po diagnozie w Zgorzelcu." />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "OfferCatalog",
            "name": "Cennik — ByteClinic",
            "itemListElement": [
              ${priceRows.map((sec, i)=>`{"@type":"OfferCatalog","name":"${sec.section}","itemListElement":[${sec.items.map(it=>`{"@type":"Service","name":"${it.name}","offers":{"@type":"Offer","priceCurrency":"PLN","price":"${it.price.replace(/[^0-9]/g,'')||''}"}}`).join(',')}]}`).join(',')}
            ]
          }
        `}</script>
        <script type="application/ld+json">{`
          {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","position":1,"name":"Start","item":"/"},
            {"@type":"ListItem","position":2,"name":"Cennik","item":"/cennik"}
          ]}
        `}</script>
      </Helmet>

      {/* Hero Section */}
      <SectionWrapper className="py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-primary">Cennik</span> usług
          </h1>
          <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
            Transparentne ceny za profesjonalne usługi IT. Wszystkie ceny brutto. 
            Ostateczna wycena po diagnozie w Zgorzelcu.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Badge variant="secondary" className="p-2">
              <CheckCircle className="w-4 h-4 mr-1" />
              Gwarancja na usługi
            </Badge>
            <Badge variant="secondary" className="p-2">
              <Shield className="w-4 h-4 mr-1" />
              Bezpieczne dane
            </Badge>
            <Badge variant="secondary" className="p-2">
              <Award className="w-4 h-4 mr-1" />
              Certyfikowani specjaliści
            </Badge>
          </div>
        </div>
      </SectionWrapper>

      {/* Info Cards */}
      <SectionWrapper className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-6 text-center">
              <Info className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold mb-2">Orientacyjne ceny</h3>
              <p className="text-sm text-muted-foreground">
                Podane ceny są orientacyjne. Ostateczna wycena po dokładnej diagnozie.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold mb-2">Szybka realizacja</h3>
              <p className="text-sm text-muted-foreground">
                Diagnoza w 24-48h, większość napraw w ciągu 24-48 godzin.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-6 text-center">
              <MapPin className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold mb-2">Lokalny serwis</h3>
              <p className="text-sm text-muted-foreground">
                Zgorzelec i okolice. Dojazd płatny dodatkowo.
              </p>
            </CardContent>
          </Card>
        </div>
      </SectionWrapper>

      {/* Category Filter */}
      <SectionWrapper className="py-6">
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
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

      {/* Pricing Grid */}
      <SectionWrapper className="pb-8">
        <div className="space-y-8">
          {filteredRows.map((section, sectionIndex) => (
            <motion.section 
              key={section.section} 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.5, delay: sectionIndex * 0.1 }}
            >
              <Card className={`border ${section.color}`}>
                <CardHeader>
                  <CardTitle className="font-mono text-2xl flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    {section.section}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {section.items.map((item, itemIndex) => (
                      <motion.div 
                        key={itemIndex}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: itemIndex * 0.05 }}
                        className="relative"
                      >
                        <div className={`p-4 rounded-lg border bg-card/50 ${item.popular ? 'border-primary/30 bg-primary/5' : 'border-border/60'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="flex-grow">
                              <div className="flex items-start gap-3">
                                <h4 className="font-semibold text-lg flex-grow">{item.name}</h4>
                                {item.popular && (
                                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                                    <Star className="w-3 h-3 mr-1" />
                                    Popularne
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div className="rounded bg-background/60 p-2 border border-border/60">
                                  <span className="text-muted-foreground">Cena od</span>
                                  <div className="font-mono font-bold text-primary text-base">{item.price}</div>
                                </div>
                                <div className="rounded bg-background/60 p-2 border border-border/60">
                                  <span className="text-muted-foreground">Czas</span>
                                  <div className="font-semibold">{item.time}</div>
                                </div>
                                <div className="rounded bg-background/60 p-2 border border-border/60">
                                  <span className="text-muted-foreground">Uwagi</span>
                                  <div className="text-muted-foreground break-words">{item.note}</div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-0 lg:min-w-48">
                              <Button asChild className="w-full min-w-0">
                                <a href="/kontakt" aria-label={`Umów wizytę: ${item.name}`}>
                                  <Calculator className="w-4 h-4 mr-2" />
                                  Umów wizytę
                                </a>
                              </Button>
                              <Button 
                                variant="secondary" 
                                className="w-full min-w-0" 
                                onClick={() => openContact(item.name)}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Zapytaj o wycenę
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          ))}
        </div>
      </SectionWrapper>

      {/* Contact CTA */}
      <SectionWrapper className="py-12 bg-muted/30">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold font-mono mb-4">
              Potrzebujesz niestandardowej wyceny?
            </h3>
            <p className="text-muted-foreground mb-6">
              Jeśli nie znalazłeś odpowiedniej pozycji w cenniku, opisz swój projekt. 
              Wyceniamy każde zlecenie indywidualnie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" onClick={handleQuickQuote}>
                <a>
                  <Calculator className="w-4 h-4 mr-2" />
                  Oblicz wycenę
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="tel:+48724316523">
                  <Phone className="w-4 h-4 mr-2" />
                  Zadzwoń: +48 724 316 523
                </a>
              </Button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Godziny pracy: Pon-Pt 9:00-17:00, Sob 10:00-14:00</p>
            </div>
          </CardContent>
        </Card>
      </SectionWrapper>

      {/* Important Notes */}
      <SectionWrapper className="pb-8">
        <Card className="max-w-4xl mx-auto bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Ważne informacje
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Ceny są orientacyjne - ostateczna wycena po diagnozie</li>
                <li>• Czas realizacji liczony od momentu przyjęcia zlecenia</li>
                <li>• Wystawiamy paragony lub faktury VAT na życzenie</li>
                <li>• Gwarancja 3 miesiące na pracę, 12 miesięcy na części</li>
              </ul>
              <ul className="space-y-2">
                <li>• Dojazd płatny: 49 PLN w mieście, 99 PLN poza miastem</li>
                <li>• W pilnych przypadkach możliwość express (dopłata 50 PLN)</li>
                <li>• Wszystkie dane chronione zgodnie z RODO</li>
                <li>• Możliwość płatności: gotówka, przelew, BLIK</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </SectionWrapper>

      {/* Quick Quote Modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="bg-card/90 backdrop-blur-md border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-mono">Zapytaj o wycenę</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Usługa: {contactService}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input 
              ref={nameRef} 
              autoFocus 
              placeholder="Imię i nazwisko" 
              value={contactName} 
              onChange={(e)=>setContactName(e.target.value)} 
              autoComplete="name" 
              inputMode="text" 
            />
            <Input 
              type="email" 
              placeholder="E-mail" 
              value={contactEmail} 
              onChange={(e)=>setContactEmail(e.target.value)} 
              autoComplete="email" 
              inputMode="email" 
            />
            <Textarea 
              placeholder="Opisz krótko swój projekt lub problem" 
              value={contactMsg} 
              onChange={(e)=>setContactMsg(e.target.value)} 
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=> setContactOpen(false)}>Anuluj</Button>
            <Button onClick={()=> { 
              // tutaj możesz dodać submit do API/email 
              setContactOpen(false); 
              alert('Dziękujemy! Skontaktujemy się w ciągu 24h.');
            }}>
              Wyślij zapytanie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default Pricing;
