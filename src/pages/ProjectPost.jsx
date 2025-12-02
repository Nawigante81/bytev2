import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import SectionWrapper from '@/components/SectionWrapper';
import { Button } from '@/components/ui/button';
import NotFound from '@/pages/NotFound';

const projectsData = {
  "monitor-temperatury-cpu": {
    title: "Monitor temperatury CPU na OLED (ESP32)",
    author: "ByteClinic",
    date: "2025-09-24",
    imageAlt: "Projekt ESP32 z wyświetlaczem OLED pokazującym temperaturę procesora komputera",
    imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1778&auto=format&fit=crop",
    content: `
      <p class="lead">Stworzenie małego, niezależnego monitora temperatury CPU to świetny projekt na weekend. Użyjemy ESP32 i małego wyświetlacza OLED, aby w czasie rzeczywistym śledzić, czy nasz komputer się nie przegrzewa.</p>
      
      <h2 id="komponenty">Wymagane komponenty</h2>
      <ul>
        <li>ESP32 Dev Kit</li>
        <li>Wyświetlacz OLED 0.96" I2C (128x64)</li>
        <li>Kilka przewodów połączeniowych</li>
        <li>Serwer (np. PC z Pythonem), który będzie wysyłał dane o temperaturze</li>
      </ul>

      <h2 id="logika">Logika działania</h2>
      <p>1. Na komputerze PC uruchamiamy prosty skrypt w Pythonie, który odczytuje temperaturę CPU i udostępnia ją przez lokalny serwer HTTP.</p>
      <p>2. ESP32 łączy się z naszą siecią Wi-Fi.</p>
      <p>3. Co kilka sekund ESP32 wysyła zapytanie HTTP GET do serwera na PC, aby pobrać aktualną temperaturę.</p>
      <p>4. Odebrane dane są parsowane i wyświetlane na ekranie OLED.</p>

      <h2 id="wyzwania">Wyzwania i rozwiązania</h2>
      <p><strong>Problem z Wi-Fi:</strong> Upewnij się, że ESP32 ma dobry zasięg. Warto dodać mechanizm ponownego łączenia w przypadku utraty połączenia.</p>
      <p><strong>Format danych:</strong> Najprościej jest, gdy serwer zwraca temperaturę jako czysty tekst lub prosty JSON (np. <code>{"temp": 55.5}</code>). Ułatwia to parsowanie na ESP32.</p>
    `
  },
  "captive-portal-wifi": {
    title: "Captive Portal Wi-Fi na ESP32",
    author: "ByteClinic",
    date: "2025-09-23",
    imageAlt: "Smartfon połączony z siecią Wi-Fi z Captive Portal, wyświetlający stronę logowania",
    imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1770&auto=format&fit=crop",
    content: `
      <p class="lead">Captive Portal to strona, która pojawia się automatycznie po połączeniu z siecią Wi-Fi, zanim uzyskamy pełny dostęp do internetu. To świetne narzędzie marketingowe lub informacyjne. Zbudujemy je na tanim ESP32.</p>
      
      <h2 id="jak-to-dziala">Jak to działa?</h2>
      <p>ESP32 tworzy otwartą sieć Wi-Fi (Access Point). Kiedy urządzenie (telefon, laptop) się z nią połączy, system operacyjny próbuje sprawdzić dostęp do internetu. ESP32 przechwytuje to zapytanie (DNS) i zamiast prawdziwej strony, zawsze zwraca adres IP samego siebie. W efekcie przeglądarka otwiera stronę serwowaną przez ESP32 - nasz portal.</p>

      <h2 id="kroki">Kluczowe kroki implementacji</h2>
      <ol>
        <li><strong>Tryb Access Point (AP):</strong> Skonfiguruj ESP32 do pracy jako punkt dostępowy z określoną nazwą sieci (SSID).</li>
        <li><strong>Serwer DNS:</strong> Uruchom na ESP32 serwer DNS, który na każde zapytanie o dowolną domenę będzie odpowiadał adresem IP ESP32.</li>
        <li><strong>Serwer WWW:</strong> Uruchom serwer WWW, który będzie serwował stronę HTML naszego portalu.</li>
      </ol>

      <h2 id="zastosowania">Przykładowe zastosowania</h2>
      <ul>
        <li>Wyświetlanie menu w restauracji.</li>
        <li>Zbieranie adresów e-mail w zamian za dostęp do Wi-Fi.</li>
        <li>Prezentacja informacji o wydarzeniu lub miejscu.</li>
      </ul>
    `
  },
  "panel-statusu-sieci": {
    title: "Panel statusu sieci domowej + ping",
    author: "ByteClinic",
    date: "2025-09-22",
    imageAlt: "Panel z kolorowymi diodami LED pokazujący status sieci domowej",
    imageUrl: "https://images.unsplash.com/photo-1558346547-44375f8d4a42?q=80&w=1770&auto=format&fit=crop",
    content: `
      <p class="lead">Czy Twój serwer NAS działa? Czy jest dostęp do internetu? Zamiast logować się i sprawdzać ręcznie, zbudujmy prosty panel, który na pierwszy rzut oka pokaże status kluczowych usług w Twojej sieci domowej.</p>
      
      <h2 id="idea">Główna idea</h2>
      <p>Użyjemy mikrokontrolera ESP8266 (lub ESP32), który połączy się z Wi-Fi i będzie cyklicznie "pingował" zdefiniowane adresy IP w sieci lokalnej oraz adresy w internecie. Wynik każdego testu będzie sygnalizowany kolorem diody LED.</p>
      <ul>
        <li><strong>Zielony:</strong> Usługa odpowiada, wszystko OK.</li>
        <li><strong>Czerwony:</strong> Brak odpowiedzi, problem z usługą.</li>
        <li><strong>Żółty/Pomarańczowy:</strong> Wysoki ping lub utrata pakietów.</li>
      </ul>

      <h2 id="przykladowa-konfiguracja">Przykładowa konfiguracja do monitorowania</h2>
      <ol>
        <li><strong>Dioda 1 (Internet):</strong> Ping na <code>8.8.8.8</code> (serwer DNS Google).</li>
        <li><strong>Dioda 2 (Router):</strong> Ping na <code>192.168.1.1</code> (adres bramy domyślnej).</li>
        <li><strong>Dioda 3 (Serwer NAS):</strong> Ping na lokalny adres IP serwera plików.</li>
        <li><strong>Dioda 4 (Inna usługa):</strong> Ping na dowolne inne urządzenie, np. drukarkę sieciową.</li>
      </ol>

      <h2 id="biblioteki">Przydatne biblioteki (Arduino)</h2>
      <p>Do tego projektu idealnie nadaje się biblioteka <code>ESP8266Ping</code>, która w prosty sposób pozwala na wysyłanie zapytań ICMP i analizowanie odpowiedzi.</p>
    `
  }
};

const ProjectPost = () => {
  const { slug } = useParams();
  const project = projectsData[slug];

  if (!project) {
    return <NotFound />;
  }

  return (
    <PageTransition>
      <Helmet>
        <title>{project.title} - ByteClinic</title>
        <meta name="description" content={project.content.substring(0, 160)} />
      </Helmet>
      <article>
        <header className="mb-8">
          <div className="w-full aspect-video max-h-[400px] rounded-lg overflow-hidden mb-4">
            {project.slug === 'panel-statusu-sieci' ? (
              <img alt={project.imageAlt} className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1521118213897-df6fef51f4e1" loading="lazy" />
            ) : (
              <img src={project.imageUrl} alt={project.imageAlt} className="w-full h-full object-cover" loading="lazy" />
            )}
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-3xl md:text-5xl font-bold text-secondary"
          >
            {project.title}
          </motion.h1>
          <p className="text-muted-foreground mt-2">
            Autor: {project.author} | Opublikowano: {new Date(project.date).toLocaleDateString('pl-PL')}
          </p>
        </header>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: project.content }}
        />

        <SectionWrapper>
          <div className="text-center">
            <Button asChild variant="secondary">
              <Link to="/projekty"><ArrowLeft className="w-4 h-4 mr-2" /> Powrót do projektów</Link>
            </Button>
          </div>
        </SectionWrapper>
      </article>
    </PageTransition>
  );
};

export default ProjectPost;
