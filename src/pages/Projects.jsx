import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import SectionWrapper from '@/components/SectionWrapper';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Cpu, Wifi, Thermometer, ArrowRight } from 'lucide-react';

const projects = [
  {
    slug: "monitor-temperatury-cpu",
    icon: Thermometer,
    title: "Monitor temperatury CPU na OLED (ESP32)",
    description: "Prosty monitor, który pobiera dane o temperaturze z serwera i wyświetla je w czasie rzeczywistym na małym ekranie OLED.",
    imageAlt: "Projekt ESP32 z wyświetlaczem OLED pokazującym temperaturę procesora komputera",
    imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1778&auto=format&fit=crop",
    tags: ["ESP32", "OLED", "Monitoring"],
  },
  {
    slug: "captive-portal-wifi",
    icon: Wifi,
    title: "Captive Portal Wi-Fi na ESP32",
    description: "Tworzy sieć Wi-Fi, która przekierowuje użytkowników na stronę powitalną. Idealne do zbierania adresów e-mail lub wyświetlania informacji.",
    imageAlt: "Smartfon połączony z siecią Wi-Fi z Captive Portal, wyświetlający stronę logowania",
    imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1770&auto=format&fit=crop",
    tags: ["ESP32", "Wi-Fi", "Networking"],
  },
  {
    slug: "panel-statusu-sieci",
    icon: Cpu,
    title: "Panel statusu sieci domowej + ping",
    description: "Urządzenie, które cyklicznie sprawdza dostępność kluczowych usług w sieci (np. router, serwer NAS) i sygnalizuje ich status diodami LED.",
    imageAlt: "Panel z kolorowymi diodami LED pokazujący status sieci domowej",
    imageUrl: "https://images.unsplash.com/photo-1558346547-44375f8d4a42?q=80&w=1770&auto=format&fit=crop",
    tags: ["ESP8266", "DIY", "Home Lab"],
  },
];

const Projects = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Projekty IoT/ESP32 - ByteClinic</title>
        <meta name="description" content="Zobacz moje projekty DIY oparte o ESP32 i inne mikrokontrolery. Od stacji pogodowych po narzędzia do analizy sieci." />
      </Helmet>
      <SectionWrapper>
        <SectionTitle subtitle="Od pomysłu do działającego prototypu.">Projekty IoT / ESP32</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-background/50 border-secondary/20 h-full flex flex-col overflow-hidden group">
                <div className="aspect-video bg-muted overflow-hidden">
                  {project.slug === 'panel-statusu-sieci' ? (
                    <img alt={project.imageAlt} width="1280" height="720" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1521118213897-df6fef51f4e1" sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <img alt={project.imageAlt} width="1280" height="720" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={project.imageUrl} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, 50vw" />
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <project.icon className="w-8 h-8 text-secondary flex-shrink-0 mt-1" />
                    <CardTitle className="font-mono text-xl">{project.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground mb-4">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-xs font-mono bg-secondary/20 text-secondary px-2 py-1 rounded">{tag}</span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="secondary" className="w-full">
                    <Link to={`/projekty/${project.slug}`}>
                      Zobacz szczegóły <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>
    </PageTransition>
  );
};

export default Projects;
