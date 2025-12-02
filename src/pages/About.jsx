import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import MetaTags from '@/components/MetaTags';
import SectionTitle from '@/components/SectionTitle';
import SectionWrapper from '@/components/SectionWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Award, Users, Zap, Shield, Wrench, HeartHandshake } from 'lucide-react';

const About = () => {
  const stats = [
    { number: "500+", label: "Naprawionych urządzeń", icon: Wrench },
    { number: "5+", label: "Lat doświadczenia", icon: Award },
    { number: "98%", label: "Zadowolonych klientów", icon: Users },
    { number: "24h", label: "Średni czas diagnozy", icon: Zap },
  ];

  const values = [
    {
      icon: Shield,
      title: "Bezpieczeństwo danych",
      description: "RODO, kopie zapasowe, pełna poufność - Twoje dane są u nas bezpieczne."
    },
    {
      icon: Zap,
      title: "Szybka realizacja", 
      description: "Diagnoza w 24-48h, większość napraw w ciągu 24h. Czas to pieniądz."
    },
    {
      icon: HeartHandshake,
      title: "Uczciwa wycena",
      description: "Transparentne ceny, brak ukrytych kosztów. Wycena przed pracą."
    },
    {
      icon: Award,
      title: "Gwarancja jakości",
      description: "Gwarancja na wykonaną usługę i wymienione części. Jakość to podstawa."
    }
  ];

  const certifications = [
    "Microsoft Certified Professional (MCP)",
    "CompTIA A+",
    "Cisco CCNA",
    "Zawodowe uprawnienia elektryczne",
    "Certyfikaty bezpieczeństwa IT"
  ];

  return (
    <PageTransition>
      <MetaTags
        title="O nas - ByteClinic | Poznaj naszą historię"
        description="Poznaj ByteClinic - profesjonalny serwis komputerowy w Zgorzelcu. 5+ lat doświadczenia, setki zadowolonych klientów, pełna gwarancja."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/o-nas"
        type="website"
        canonical="https://www.byteclinic.pl/o-nas"
      />

      {/* Hero Section */}
      <SectionWrapper className="py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="border-primary/20">
                <Clock className="w-3 h-3 mr-1" />
                Pon-Pt: 9:00-17:00
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold font-mono mb-6">
              ByteClinic<br />
              <span className="text-primary">Serwis, który ogarnia temat</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Jesteśmy lokalnym serwisem komputerowym z siedzibą w Zgorzelcu. 
              Specjalizujemy się w naprawie laptopów, PC, diagnostyce sprzętu oraz 
              kompleksowym wsparciu IT dla firm i klientów indywidualnych.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <Link to="/kontakt">Umów naprawę</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/uslugi">Zobacz usługi</Link>
              </Button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <img
              src="/images/nie uzyte/ChatGPT Image 2 gru 2025, 12_36_16-800.webp"
              alt="Wnętrze serwisu ByteClinic w Zgorzelcu"
              className="w-full rounded-xl shadow-2xl border border-primary/20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* Stats Section */}
      <SectionWrapper className="py-12 bg-muted/30">
        <SectionTitle subtitle="Nasze osiągnięcia w liczbach.">Doświadczenie ByteClinic</SectionTitle>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                  <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold font-mono text-primary mb-2">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* Story Section */}
      <SectionWrapper className="py-12">
        <div className="max-w-4xl mx-auto">
          <SectionTitle subtitle="Poznaj naszą historię i misję.">Nasza historia</SectionTitle>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-card/70 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-xl">Skąd się wzięliśmy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  ByteClinic powstał z pasji do technologii i chęci pomagania ludziom w rozwiązywaniu 
                  problemów komputerowych. Zaczęliśmy jako lokalny serwis w Zgorzelcu, obsługując 
                  pierwszych klientów z okolicy.
                </p>
                <p>
                  Z czasem rozszerzyliśmy nasze usługi, zdobyliśmy certyfikaty i zaufali nam 
                  kolejni klienci. Dziś jesteśmy jednym z najbardziej rozpoznawalnych serwisów 
                  w regionie.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/70 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-xl">Nasza misja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Dostarczamy profesjonalne usługi IT w przystępny sposób. Wierzymy, że każdy 
                  zasługuje na sprawnie działający sprzęt i bezproblemowe wsparcie techniczne.
                </p>
                <p>
                  Krótko, konkretnie i po inżyniersku - to nasze motto. Bez zbędnej teorii, 
                  za to z praktycznymi rozwiązaniami, które działają.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SectionWrapper>

      {/* Values Section */}
      <SectionWrapper className="py-12 bg-muted/30">
        <SectionTitle subtitle="To nas wyróżnia na tle konkurencji.">Nasze wartości</SectionTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-card/70 border-primary/20 backdrop-blur-sm text-center">
                <CardHeader>
                  <value.icon className="w-12 h-12 text-primary mx-auto mb-2" />
                  <CardTitle className="font-mono text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* Certifications Section */}
      <SectionWrapper className="py-12">
        <SectionTitle subtitle="Uznane certyfikaty i uprawnienia.">Nasze kwalifikacje</SectionTitle>
        
        <Card className="max-w-4xl mx-auto bg-card/70 border-primary/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-mono text-xl text-center">Certyfikaty i uprawnienia</CardTitle>
          </CardHeader>
          <CardContent>
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
            
            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-4">
                Ciągle się rozwijamy i zdobywamy nowe kwalifikacje, aby oferować Państwu 
                najlepsze usługi na rynku.
              </p>
              <Button asChild variant="secondary">
                <Link to="/kontakt">Porozmawiajmy o Twoim problemie</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </SectionWrapper>

      {/* Contact CTA */}
      <SectionWrapper className="py-12">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold font-mono mb-4">
              Potrzebujesz pomocy z komputerem?
            </h3>
            <p className="text-muted-foreground mb-6">
              Nie zwlekaj - im szybciej zgłosisz problem, tym łatwiej go rozwiązać. 
              Skontaktuj się z nami już dziś!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/kontakt">Zgłoś problem</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="tel:+48724316523">Zadzwoń: +48 724 316 523</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </SectionWrapper>
    </PageTransition>
  );
};

export default About;