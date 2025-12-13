# 🔧 Instrukcja Konfiguracji Meta Tagów i Logo dla Social Media

**Data:** 2025-12-02  
**Dotyczy:** Konfiguracja obrazków logo i miniaturek dla udostępniania w mediach społecznościowych

---

## 🎯 Podstawy

Meta tagi kontrolują jak strona wygląda w:
- **Social Media** (Facebook, LinkedIn, Twitter/X)
- **Komunikatory** (Messenger, WhatsApp, iMessage) 
- **Wyszukiwarki** (Google, Bing)

**Dlaczego ważne:** CTR +20-40%, profesjonalny wygląd, lepsze SEO

---

## 📱 Open Graph Protocol

### Podstawowe tagi OG

```html
<!-- Open Graph - Podstawowe -->
<meta property="og:title" content="ByteClinic – Serwis komputerowy i IT Zgorzelec" />
<meta property="og:description" content="Naprawa komputerów, serwis laptopów, odzyskiwanie danych, instalacje systemów." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="ByteClinic" />
<meta property="og:url" content="https://www.byteclinic.pl/" />
<meta property="og:locale" content="pl_PL" />

<!-- Open Graph - Obraz -->
<meta property="og:image" content="https://www.byteclinic.pl/og.png" />
<meta property="og:image:secure_url" content="https://www.byteclinic.pl/og.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="ByteClinic — serwis komputerowy i IT Zgorzelec" />
```

### Zaawansowane tagi OG

```html
<!-- Dla artykułów/bloga -->
<meta property="article:author" content="ByteClinic" />
<meta property="article:publisher" content="https://www.byteclinic.pl" />
<meta property="article:published_time" content="2025-12-02T17:00:00Z" />

<!-- Dla lokalnych biznesów -->
<meta property="business:contact_data:street_address" content="ul. Przykładowa 123" />
<meta property="business:contact_data:locality" content="Zgorzelec" />
<meta property="business:contact_data:postal_code" content="59-900" />
```

---

## 🐦 Twitter Cards

### Summary Large Image Card (Zalecane)

```html
<!-- Twitter Cards - Zdjęcie duże -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@ByteClinic" />
<meta name="twitter:title" content="ByteClinic – Serwis komputerowy i IT Zgorzelec" />
<meta name="twitter:description" content="Naprawa komputerów, serwis laptopów, odzyskiwanie danych." />
<meta name="twitter:image" content="https://www.byteclinic.pl/og.png" />
<meta name="twitter:image:alt" content="ByteClinic — serwis komputerowy i IT Zgorzelec" />
```

### Summary Card (Małe zdjęcie)

```html
<!-- Twitter Cards - Małe zdjęcie -->
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="ByteClinic – Serwis komputerowy" />
<meta name="twitter:description" content="Profesjonalny serwis komputerowy w Zgorzelcu" />
<meta name="twitter:image" content="https://www.byteclinic.pl/logo.png" />
```

---

## 🎨 Favicon i Apple Touch Icons

### Podstawowe favicony

```html
<!-- Favicon podstawowe -->
<link rel="icon" type="image/png" href="/logo.png" />
<link rel="shortcut icon" href="/logo.ico" />

<!-- Apple Touch Icons -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />
<link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120.png" />
<link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon-76.png" />

<!-- Standardowe rozmiary -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

<!-- PWA -->
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0a0f1a" />
```

### Specyfikacje favicon

| Rozmiar | Zastosowanie |
|---------|--------------|
| 16x16 | Karty przeglądarki |
| 32x32 | Karty przeglądarki (Retina) |
| 48x48 | Android Chrome |
| 192x192 | Android Chrome |
| 512x512 | Android Chrome |

### Apple Touch Icons specyfikacje

| Rozmiar | Urządzenia |
|---------|------------|
| 57x57 | iPhone (non-Retina) |
| 60x60 | iPhone (iOS 7) |
| 72x72 | iPad (non-Retina) |
| 76x76 | iPad (iOS 7) |
| 114x114 | iPhone (Retina) |
| 120x120 | iPhone (iOS 7) |
| 144x144 | iPad (Retina) |
| 152x152 | iPad (iOS 7) |
| 180x180 | iPhone 6 Plus |

---

## 📱 PWA Manifest (site.webmanifest)

```json
{
  "name": "ByteClinic - Serwis komputerowy",
  "short_name": "ByteClinic", 
  "description": "Profesjonalny serwis komputerowy w Zgorzelcu",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0f1a",
  "theme_color": "#0a0f1a",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png", 
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512", 
      "type": "image/png"
    }
  ]
}
```

---

## ⚛️ Implementacja w React

### 1. Komponent MetaTags

```jsx
// src/components/MetaTags.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

const MetaTags = ({
  title,
  description,
  image = '/og.png',
  url,
  type = 'website',
  siteName = 'ByteClinic'
}) => {
  const currentUrl = url || (typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://www.byteclinic.pl/');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:locale" content="pl_PL" />
      
      {/* Open Graph - Image details */}
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ByteClinic" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* Structured Data JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": type === 'article' ? 'Article' : 'WebPage',
          "headline": title,
          "description": description,
          "image": image,
          "url": currentUrl,
          "publisher": {
            "@type": "Organization",
            "name": siteName,
            "logo": {
              "@type": "ImageObject",
              "url": "https://www.byteclinic.pl/logo.png"
            }
          }
        })}
      </script>
    </Helmet>
  );
};

export default MetaTags;
```

### 2. Implementacja w komponentach

#### Home.jsx

```jsx
import MetaTags from '@/components/MetaTags';

const Home = () => {
  return (
    <>
      <MetaTags
        title="ByteClinic - Strona Główna | Serwis komputerowy Zgorzelec"
        description="Profesjonalny serwis komputerowy w Zgorzelcu. Naprawa laptopów, PC, odzyskiwanie danych. 5+ lat doświadczenia, 500+ zadowolonych klientów."
        image="/og.png"
        url="https://www.byteclinic.pl/"
        type="website"
      />
      
      {/* Rest of component */}
    </>
  );
};

export default Home;
```

#### Services.jsx

```jsx
import MetaTags from '@/components/MetaTags';

const Services = () => {
  return (
    <>
      <MetaTags
        title="Usługi - ByteClinic | Pełna oferta serwisowa"
        description="Pełna oferta usług serwisowych ByteClinic. Diagnoza, naprawa, optymalizacja, odzyskiwanie danych, sieci, serwery."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/uslugi"
        type="website"
      />
      
      {/* Rest of component */}
    </>
  );
};

export default Services;
```

#### ProductDetailPage.jsx

```jsx
import MetaTags from '@/components/MetaTags';
import { useParams } from 'react-router-dom';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  // Fetch product data...
  
  return (
    <>
      <MetaTags
        title={`${product.name} - Sklep ByteClinic`}
        description={product.description?.substring(0, 160)}
        image={product.image || '/og.png'}
        url={`https://www.byteclinic.pl/sklep/${product.id}`}
        type="product"
      />
      
      {/* Product details */}
    </>
  );
};

export default ProductDetailPage;
```

#### BlogPost.jsx

```jsx
import MetaTags from '@/components/MetaTags';
import { useParams } from 'react-router-dom';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);

  // Fetch blog post data...
  
  return (
    <>
      <MetaTags
        title={`${post.title} - ByteClinic Blog`}
        description={post.excerpt || post.content.substring(0, 160)}
        image={post.featuredImage || '/og.png'}
        url={`https://www.byteclinic.pl/blog/${post.slug}`}
        type="article"
      />
      
      {/* Article content */}
    </>
  );
};

export default BlogPost;
```

---

## 🖼️ Specyfikacje obrazów

### Open Graph Images
- **Wymiary:** 1200x630px (ratio 1.91:1)
- **Format:** PNG (zalecane), JPG
- **Rozmiar pliku:** Maksymalnie 8MB
- **Kolor:** RGB

### Twitter Card Images
- **Summary Large Image:** 1200x600px (2:1)
- **Summary Image:** 120x120px (1:1)

### Dobre praktyki dla obrazów

```html
<!-- Preload ważnych obrazów -->
<link rel="preload" href="/images/glowne.webp" as="image" type="image/webp" />

<!-- Responsive images -->
<img
  src="/images/og-800.webp"
  srcset="/images/og-400.webp 400w,
          /images/og-800.webp 800w,
          /images/og-1200.webp 1200w"
  sizes="(max-width: 800px) 800px, 1200px"
  alt="ByteClinic - Serwis komputerowy"
/>
```

### Generowanie obrazów

```bash
# Using ImageMagick
convert logo.svg -resize 1200x630 og.png
convert logo.svg -resize 1200x600 twitter-card.png
convert logo.svg -resize 32x32 favicon-32x32.png

# Using Sharp (Node.js)
const sharp = require('sharp');

sharp('logo.svg')
  .resize(1200, 630)
  .png()
  .toFile('og.png');
```

---

## 🧪 Testowanie i debugowanie

### Narzędzia do testowania

#### Facebook Sharing Debugger
```
https://developers.facebook.com/tools/debug/
```
- Testuje podglądy Facebook i Messenger
- Czas odświeżania cache: ~24h

#### Twitter Card Validator
```
https://cards-dev.twitter.com/validator
```
- Testuje podglądy Twitter/X
- Instant preview

#### LinkedIn Post Inspector
```
https://www.linkedin.com/post-inspector/
```
- Testuje podglądy LinkedIn

#### Discord Embed Debugger
```
https://embed.discordapp.net/
```
- Testuje embedy w Discord

### Debugging checklist

```bash
# Sprawdź cache
curl -I https://yourdomain.com/og.png

# Waliduj HTML
https://validator.w3.org/

# Testuj mobile
https://search.google.com/test/mobile-friendly/
```

### Typowe problemy i rozwiązania

#### Problem: Cache nie się odświeża
**Rozwiązanie:**
```javascript
// Dodaj timestamp do URL obrazu
const imageUrl = `https://yoursite.com/og.png?v=${Date.now()}`;
```

#### Problem: Obraz się nie wyświetla
**Sprawdź:**
- CORS headers: `Access-Control-Allow-Origin: *`
- Prawidłowy Content-Type
- Rozmiar pliku < 8MB

#### Problem: Twitter Card się nie aktywuje
**Sprawdź:**
- Twitter Card Validator
- Metatagi muszą być w sekcji `<head>`
- HTTPS wymagane

---

## 💡 Praktyczne przykłady

### E-commerce

```jsx
const ProductMetaTags = ({ product }) => (
  <MetaTags
    title={`${product.name} - Sklep ByteClinic`}
    description={product.description?.substring(0, 160)}
    image={product.images[0]?.url}
    url={`https://byteclinic.pl/produkt/${product.id}`}
    type="product"
  />
  
  <Helmet>
    <meta property="product:price:amount" content={product.price} />
    <meta property="product:price:currency" content="PLN" />
    <meta property="product:availability" content="in stock" />
  </Helmet>
);
```

### Blog/Artykuły

```jsx
const ArticleMetaTags = ({ article }) => (
  <MetaTags
    title={`${article.title} - ByteClinic Blog`}
    description={article.excerpt}
    image={article.featuredImage}
    url={`https://byteclinic.pl/blog/${article.slug}`}
    type="article"
  />
  
  <Helmet>
    <meta property="article:author" content={article.author} />
    <meta property="article:published_time" content={article.publishedAt} />
    <meta property="article:section" content={article.category} />
  </Helmet>
);
```

### Lokalny biznes

```jsx
const LocalBusinessMetaTags = () => (
  <MetaTags
    title="ByteClinic - Serwis komputerowy Zgorzelec"
    description="Profesjonalny serwis komputerowy w Zgorzelcu."
    image="/og.png"
    type="website"
  />
  
  <Helmet>
    <meta property="business:contact_data:phone_number" content="+48724316523" />
    <meta property="business:contact_data:website" content="https://byteclinic.pl" />
  </Helmet>
  
  {/* Schema.org structured data */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "ByteClinic",
      "image": "https://byteclinic.pl/logo.png",
      "url": "https://byteclinic.pl",
      "telephone": "+48724316523",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "ul. Przykładowa 123",
        "addressLocality": "Zgorzelec",
        "postalCode": "59-900",
        "addressCountry": "PL"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "17:00"
        }
      ]
    })}
  </script>
);
```

---

## ⚡ Szybka implementacja

### Kroki natychmiastowe:

1. **Utwórz komponent MetaTags** (30 min)
2. **Zainstaluj w 4 głównych stronach** (1-2 h)
3. **Przetestuj na Facebook Debugger** (30 min)
4. **Przetestuj na Twitter Validator** (30 min)

### Skrypt do generowania faviconów

```bash
#!/bin/bash
# generate-favicons.sh

# OG Image (1200x630)
convert logo.png -resize 1200x630 og.png

# Twitter Card (1200x600)  
convert logo.png -resize 1200x600 twitter-card.png

# Favicons różne rozmiary
for size in 16 32 48 64 96 128 192 256 384 512; do
  convert logo.png -resize ${size}x${size} favicon-${size}x${size}.png
done

# ICO dla favicon
convert favicon-16x16.png favicon-32x32.png favicon.ico
```

---

## 🚫 Błędy do uniknięcia

### ❌ Najczęstsze błędy:

1. **Brak HTTPS** - wszystkie obrazy muszą być serwowane przez HTTPS
2. **Za duże obrazy** - maksymalnie 8MB dla OG, 5MB dla Twitter
3. **Cache nie odświeża się** - dodaj wersjonowanie do URL
4. **Błędne proporcje obrazów** - używaj dokładnych wymiarów
5. **Brak alt text** - każdy obraz musi mieć opis

### ✅ Najlepsze praktyki:

1. **Spójne branding** - używaj tych samych kolorów i fontów
2. **Jakość obrazów** - wysoka rozdzielczość, dobra kompresja
3. **Konsystentne opisy** - 120-160 znaków, bez spamu
4. **Testowanie regularne** - sprawdzaj podglądy przed publikacją
5. **Monitorowanie** - śledź performance w social media

---

## 📊 Monitoring i analiza

### Google Search Console
- Sprawdź jak Google widzi Twoje strony
- Monitoruj CTR dla różnych stron
- Analizuj błędy w structured data

### Social Media Analytics
- **Facebook Insights** - widać jak linki są udostępniane
- **Twitter Analytics** - statystyki dla linków
- **LinkedIn Analytics** - profesjonalne statystyki

---

## 🎯 Podsumowanie

Po implementacji tej instrukcji:

1. **Przetestuj każdą stronę** w narzędziach debugowania
2. **Monitoruj wyniki** przez pierwsze 2 tygodnie  
3. **Optymalizuj** na podstawie danych analitycznych
4. **Aktualizuj regularnie** meta tagi i obrazy

**Powodzenia w implementacji!** 🚀

---

*Instrukcja przygotowana na bazie projektu ByteClinic*  
*Data: 2025-12-02*