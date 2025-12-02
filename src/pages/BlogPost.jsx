import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import SectionWrapper from '@/components/SectionWrapper';
import { Button } from '@/components/ui/button';
import NotFound from '@/pages/NotFound';

const postsData = {
  "szybki-audyt-domowego-wifi": {
    title: "Szybki audyt domowego Wi-Fi: checklista na 10 min",
    author: "ByteClinic",
    date: "2025-09-26",
    imageAlt: "Router Wi-Fi na biurku obok laptopa, symbolizujący audyt sieci",
    imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=1964&auto=format&fit=crop",
    content: `
      <p class="lead">Twoja domowa sieć Wi-Fi to brama do internetu dla wszystkich Twoich urządzeń. Czy jest wystarczająco bezpieczna i wydajna? Ta 10-minutowa checklista pomoże Ci to sprawdzić bez specjalistycznej wiedzy.</p>
      
      <h2 id="spis-tresci">Spis treści</h2>
      <ul class="toc">
        <li><a href="#krok1">Krok 1: Zabezpiecz dostęp do panelu admina routera</a></li>
        <li><a href="#krok2">Krok 2: Używaj silnego szyfrowania WPA3</a></li>
        <li><a href="#krok3">Krok 3: Stwórz sieć dla gości</a></li>
        <li><a href="#krok4">Krok 4: Sprawdź siłę sygnału</a></li>
      </ul>

      <h2 id="krok1">Krok 1: Zabezpiecz dostęp do panelu admina routera</h2>
      <p>Domyślne hasło do Twojego routera (często "admin"/"admin") jest publicznie znane. Zmień je natychmiast! Wejdź na adres IP routera (zwykle 192.168.1.1 lub 192.168.0.1) i w ustawieniach systemowych zmień hasło administratora na unikalne i silne.</p>

      <h2 id="krok2">Krok 2: Używaj silnego szyfrowania WPA3</h2>
      <p>Sprawdź w ustawieniach Wi-Fi, czy używasz najnowszego standardu szyfrowania. WPA3 jest najbezpieczniejsze. Jeśli Twój router go nie obsługuje, wybierz WPA2-AES. Unikaj starszych i słabych standardów jak WEP czy WPA.</p>

      <h2 id="krok3">Krok 3: Stwórz sieć dla gości</h2>
      <p>Większość nowoczesnych routerów pozwala na utworzenie oddzielnej sieci dla gości. Umożliwia to dostęp do internetu, ale izoluje gości od Twojej głównej sieci domowej, chroniąc Twoje urządzenia i dane.</p>

      <h2 id="krok4">Krok 4: Sprawdź siłę sygnału</h2>
      <p>Użyj aplikacji na telefon (np. Wi-Fi Analyzer) do sprawdzenia siły sygnału w różnych częściach domu. Jeśli masz "martwe strefy", rozważ zmianę lokalizacji routera lub zainwestowanie w system Mesh, aby poprawić zasięg.</p>
    `
  },
  "esp32-oled-szybki-start": {
    title: "ESP32: OLED 128x64 - szybki start i pułapki",
    author: "ByteClinic",
    date: "2025-09-25",
    imageAlt: "Mikrokontroler ESP32 podłączony do świecącego wyświetlacza OLED",
    imageUrl: "https://images.unsplash.com/photo-1617294255534-a835c13871a3?q=80&w=1740&auto=format&fit=crop",
    content: `
      <p class="lead">Wyświetlacze OLED 0.96" (128x64) to świetny dodatek do projektów z ESP32. Są tanie, energooszczędne i łatwe w obsłudze... o ile wiesz, jak uniknąć kilku pułapek.</p>
      
      <h2 id="spis-tresci">Spis treści</h2>
      <ul class="toc">
        <li><a href="#krok1">Podłączenie (I2C)</a></li>
        <li><a href="#krok2">Instalacja bibliotek</a></li>
        <li><a href="#krok3">Przykładowy kod</a></li>
        <li><a href="#krok4">Najczęstsze problemy</a></li>
      </ul>

      <h2 id="krok1">Podłączenie (I2C)</h2>
      <p>Wyświetlacze te najczęściej komunikują się przez I2C. Podłączenie jest proste:</p>
      <ul>
        <li><strong>VCC</strong> -> 3.3V na ESP32</li>
        <li><strong>GND</strong> -> GND na ESP32</li>
        <li><strong>SCL</strong> -> GPIO 22 (domyślny SCL dla I2C)</li>
        <li><strong>SDA</strong> -> GPIO 21 (domyślny SDA dla I2C)</li>
      </ul>

      <h2 id="krok2">Instalacja bibliotek</h2>
      <p>W Arduino IDE, przez menedżera bibliotek, zainstaluj dwie kluczowe biblioteki: <code>Adafruit GFX Library</code> oraz <code>Adafruit SSD1306</code>.</p>

      <h2 id="krok3">Przykładowy kod</h2>
      <p>Poniższy kod inicjalizuje wyświetlacz i pokazuje prosty tekst:</p>
      <pre><code>#include &lt;Wire.h&gt;
#include &lt;Adafruit_GFX.h&gt;
#include &lt;Adafruit_SSD1306.h&gt;

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void setup() {
  Serial.begin(115200);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.display();
  delay(1000);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("ByteClinic.pl");
  display.display();
}

void loop() {}
</code></pre>

      <h2 id="krok4">Najczęstsze problemy</h2>
      <p><strong>Brak obrazu:</strong> Sprawdź adres I2C (zwykle 0x3C, czasem 0x3D). Użyj skanera I2C, aby go potwierdzić. Upewnij się też, że zasilanie jest stabilne.</p>
      <p><strong>"Krzaczki" na ekranie:</strong> Problem może leżeć w definicji wyświetlacza w kodzie. Upewnij się, że wymiary (128x64) są poprawne.</p>
    `
  }
};

const BlogPost = () => {
  const { slug } = useParams();
  const post = postsData[slug];

  if (!post) {
    return <NotFound />;
  }

  return (
    <PageTransition>
      <Helmet>
        <title>{post.title} - ByteClinic</title>
        <meta name="description" content={post.content.substring(0, 160)} />
      </Helmet>
      <article>
        <header className="mb-8">
          <div className="w-full aspect-video max-h-[400px] rounded-lg overflow-hidden mb-4">
             {post.slug === 'esp32-oled-szybki-start' ? (
                <img alt={post.imageAlt} className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1630856713958-ba0c27a4ac8f" loading="lazy" />
              ) : (
                <img src={post.imageUrl} alt={post.imageAlt} className="w-full h-full object-cover" loading="lazy" />
              )}
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-3xl md:text-5xl font-bold text-primary"
          >
            {post.title}
          </motion.h1>
          <p className="text-muted-foreground mt-2">
            Autor: {post.author} | Opublikowano: {new Date(post.date).toLocaleDateString('pl-PL')}
          </p>
        </header>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <SectionWrapper>
          <div className="text-center">
            <Button asChild variant="secondary">
              <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-2" /> Powrót do bloga</Link>
            </Button>
          </div>
        </SectionWrapper>
      </article>
    </PageTransition>
  );
};

export default BlogPost;
