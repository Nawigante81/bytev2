# 🔧 Przykłady Implementacji Meta Tags w ByteClinic

**Data:** 2025-12-02  
**Dotyczy:** Praktyczne przykłady użycia komponentu MetaTags w projekcie ByteClinic

---

## 📁 Komponenty do aktualizacji

### 1. Home.jsx - Strona główna

```jsx
// Aktualizacja w src/pages/Home.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const Home = () => {
  return (
    <>
      <MetaTags
        title="ByteClinic - Strona Główna | Serwis komputerowy Zgorzelec"
        description="Profesjonalny serwis komputerowy w Zgorzelcu. Naprawa laptopów, PC, odzyskiwanie danych, instalacje systemów. 5+ lat doświadczenia, 500+ zadowolonych klientów."
        image="/og.png"
        url="https://www.byteclinic.pl/"
        type="website"
        canonical="https://www.byteclinic.pl/"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default Home;
```

### 2. Services.jsx - Strona usług

```jsx
// Aktualizacja w src/pages/Services.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const Services = () => {
  return (
    <>
      <MetaTags
        title="Usługi - ByteClinic | Pełna oferta serwisowa"
        description="Pełna oferta usług serwisowych ByteClinic. Diagnoza, naprawa, optymalizacja, odzyskiwanie danych, sieci, serwery. Profesjonalny serwis w Zgorzelcu."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/uslugi"
        type="website"
        canonical="https://www.byteclinic.pl/uslugi"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default Services;
```

### 3. About.jsx - O nas

```jsx
// Aktualizacja w src/pages/About.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const About = () => {
  return (
    <>
      <MetaTags
        title="O nas - ByteClinic | Poznaj naszą historię"
        description="Poznaj ByteClinic - profesjonalny serwis komputerowy w Zgorzelcu. 5+ lat doświadczenia, setki zadowolonych klientów, pełna gwarancja."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/o-nas"
        type="website"
        canonical="https://www.byteclinic.pl/o-nas"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default About;
```

### 4. Contact.jsx - Kontakt

```jsx
// Aktualizacja w src/pages/Contact.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const Contact = () => {
  return (
    <>
      <MetaTags
        title="Kontakt - ByteClinic | Skontaktuj się z nami"
        description="Skontaktuj się z ByteClinic - profesjonalnym serwisem komputerowym w Zgorzelcu. Formularz kontaktowy, mapa, dane adresowe, godziny otwarcia."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/kontakt"
        type="website"
        canonical="https://www.byteclinic.pl/kontakt"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default Contact;
```

### 5. ProductDetailPage.jsx - Szczegóły produktu

```jsx
// Aktualizacja w src/pages/ProductDetailPage.jsx
import React, { useEffect, useState } from 'react';
import MetaTags from '@/components/MetaTags';
import { useParams } from 'react-router-dom';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Przykład pobierania danych produktu
        const response = await fetch(`/api/products/${id}`);
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        console.error('Błąd pobierania produktu:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  if (!product) {
    return <div>Produkt nie znaleziony</div>;
  }

  return (
    <>
      <MetaTags
        title={`${product.name} - Sklep ByteClinic`}
        description={product.description?.substring(0, 160) || product.name}
        image={product.image || '/og.png'}
        url={`https://www.byteclinic.pl/sklep/${product.id}`}
        type="product"
        canonical={`https://www.byteclinic.pl/sklep/${product.id}`}
        price={product.price}
        currency="PLN"
      />
      
      {/* Szczegóły produktu */}
    </>
  );
};

export default ProductDetailPage;
```

### 6. BlogPost.jsx - Artykuł blogowy

```jsx
// Aktualizacja w src/pages/BlogPost.jsx
import React, { useEffect, useState } from 'react';
import MetaTags from '@/components/MetaTags';
import { useParams } from 'react-router-dom';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogPost = async () => {
      try {
        // Przykład pobierania artykułu
        const response = await fetch(`/api/blog/${slug}`);
        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error('Błąd pobierania artykułu:', error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBlogPost();
    }
  }, [slug]);

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  if (!post) {
    return <div>Artykuł nie znaleziony</div>;
  }

  return (
    <>
      <MetaTags
        title={`${post.title} - ByteClinic Blog`}
        description={post.excerpt || post.content.substring(0, 160)}
        image={post.featuredImage || '/og.png'}
        url={`https://www.byteclinic.pl/blog/${post.slug}`}
        type="article"
        canonical={`https://www.byteclinic.pl/blog/${post.slug}`}
        publishedTime={post.publishedAt}
        modifiedTime={post.updatedAt}
        author={post.author || 'ByteClinic'}
        section={post.category || 'Technologia'}
      />
      
      {/* Treść artykułu */}
    </>
  );
};

export default BlogPost;
```

### 7. Pricing.jsx - Cennik

```jsx
// Aktualizacja w src/pages/Pricing.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const Pricing = () => {
  return (
    <>
      <MetaTags
        title="Cennik - ByteClinic | Przejrzysty cennik usług"
        description="Sprawdź cennik usług ByteClinic. Diagnoza, naprawa, optymalizacja, serwis laptopów i PC. Przejrzyste ceny bez ukrytych kosztów."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/cennik"
        type="website"
        canonical="https://www.byteclinic.pl/cennik"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default Pricing;
```

### 8. Store.jsx - Sklep

```jsx
// Aktualizacja w src/pages/Store.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const Store = () => {
  return (
    <>
      <MetaTags
        title="Sklep - ByteClinic | Akcesoria i części komputerowe"
        description="Sklep ByteClinic - akcesoria komputerowe, części, kable, dyski, pamięci RAM. Wysyłka w 24h, gwarancja na wszystkie produkty."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/sklep"
        type="website"
        canonical="https://www.byteclinic.pl/sklep"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default Store;
```

### 9. TrackRepairs.jsx - Śledzenie napraw

```jsx
// Aktualizacja w src/pages/TrackRepairs.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const TrackRepairs = () => {
  return (
    <>
      <MetaTags
        title="Śledzenie naprawy - ByteClinic | Sprawdź status swojej naprawy"
        description="Sprawdź status swojej naprawy w ByteClinic. Wprowadź numer zgłoszenia i śledź postęp prac. Aktualne informacje o Twoim sprzęcie."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/sledzenie"
        type="website"
        canonical="https://www.byteclinic.pl/sledzenie"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default TrackRepairs;
```

### 10. Booking.jsx - Rezerwacja

```jsx
// Aktualizacja w src/pages/Booking.jsx
import React from 'react';
import MetaTags from '@/components/MetaTags';

const Booking = () => {
  return (
    <>
      <MetaTags
        title="Rezerwacja wizyty - ByteClinic | Umów naprawę online"
        description="Umów wizytę w ByteClinic przez internet. Wybierz termin, opisz problem, umów wygodny termin wizyty. Szybka i prosta rezerwacja online."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/rezerwacja"
        type="website"
        canonical="https://www.byteclinic.pl/rezerwacja"
      />
      
      {/* Reszta komponentu bez zmian */}
    </>
  );
};

export default Booking;
```

---

## 🔄 Kroki implementacji

### 1. Instalacja komponentu
Skopiuj plik `MetaTags.jsx` do folderu `src/components/`

### 2. Aktualizacja importów
W każdym pliku strony dodaj import:
```jsx
import MetaTags from '@/components/MetaTags';
```

### 3. Umieszczenie w komponencie
Dodaj komponent jako pierwszy element w return każdej strony:
```jsx
return (
  <>
    <MetaTags {...props} />
    {/* reszta komponentu */}
  </>
);
```

### 4. Testowanie
Po implementacji przetestuj każdą stronę w:
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator

---

## 📱 Responsywne obrazy

### Preload dla lepszej wydajności
Dodaj preload w index.html:
```html
<link rel="preload" href="/images/glowne.webp" as="image" type="image/webp" />
```

### Responsive image component
```jsx
// src/components/ResponsiveImage.jsx
import React from 'react';

const ResponsiveImage = ({ 
  src, 
  alt, 
  className = "",
  sizes = "100vw",
  ...props 
}) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      srcSet={`${src.replace('.webp', '-400.webp')} 400w,
               ${src.replace('.webp', '-800.webp')} 800w,
               ${src.replace('.webp', '-1200.webp')} 1200w`}
      {...props}
    />
  );
};

export default ResponsiveImage;
```

---

## 🚀 Skrypt automatyzacji

### generate-favicons.sh
```bash
#!/bin/bash
# Skrypt do generowania wszystkich rozmiarów faviconów

echo "🔧 Generowanie faviconów..."

# OG Image
echo "📸 Tworzenie Open Graph image..."
convert logo.png -resize 1200x630 og.png
convert logo.png -resize 1200x630 -quality 90 og.jpg

# Twitter Card
echo "🐦 Tworzenie Twitter Card image..."
convert logo.png -resize 1200x600 twitter-card.png

# Favicons różne rozmiary
echo "🔖 Tworzenie faviconów..."
sizes=(16 32 48 64 96 128 192 256 384 512)
for size in "${sizes[@]}"; do
  echo "  - ${size}x${size}"
  convert logo.png -resize ${size}x${size} favicon-${size}x${size}.png
done

# Apple Touch Icons
echo "🍎 Tworzenie Apple Touch Icons..."
apple_sizes=(57 60 72 76 114 120 144 152 180)
for size in "${apple_sizes[@]}"; do
  echo "  - ${size}x${size}"
  convert logo.png -resize ${size}x${size} apple-touch-icon-${size}x${size}.png
done

# ICO dla favicon
echo "📄 Tworzenie favicon.ico..."
convert favicon-16x16.png favicon-32x32.png favicon.ico

echo "✅ Favicony wygenerowane pomyślnie!"
echo "📁 Sprawdź folder public/ po wygenerowane pliki"
```

### Uruchomienie skryptu
```bash
chmod +x generate-favicons.sh
./generate-favicons.sh
```

---

## 🧪 Checklist testowania

### ✅ Po implementacji sprawdź:

1. **Facebook Sharing Debugger**
   - [ ] Wszystkie strony testowane
   - [ ] Obrazy się ładują poprawnie
   - [ ] Opisy nie przekraczają 160 znaków

2. **Twitter Card Validator**
   - [ ] Twitter Cards są walidowane
   - [ ] Obrazy mają właściwe proporcje (2:1 dla summary_large_image)

3. **Walidacja HTML**
   - [ ] Brak błędów w walidatorze W3C
   - [ ] Canonical URLs są poprawne

4. **Mobile-friendly test**
   - [ ] Strony są mobile-friendly
   - [ ] Obrazy nie przekraczają rozmiarów

### 🔧 Debugowanie problemów

**Problem: Cache się nie odświeża**
```javascript
// Rozwiązanie: Dodaj wersjonowanie
const imageUrl = `/og.png?v=${Date.now()}`;
```

**Problem: Obraz nie ładuje się**
- Sprawdź ścieżkę do obrazu
- Zweryfikuj CORS headers
- Upewnij się, że rozmiar < 8MB

**Problem: Twitter Card nie działa**
- Sprawdź czy meta tagi są w sekcji `<head>`
- Używaj HTTPS dla wszystkich obrazów
- Waliduj na Twitter Card Validator

---

## 📈 Monitorowanie wyników

### Google Search Console
- Sprawdź jak Google indeksuje strony
- Monitoruj CTR dla linków w wynikach wyszukiwania

### Social Media Analytics
- **Facebook Insights** - udostępnienia linków
- **Twitter Analytics** - performance tweetów z linkami
- **LinkedIn Analytics** - previews artykułów

### Narzędzia tercerosze
- **Buffer** - analiza social media
- **Sprout Social** - zaawansowana analityka
- **Hootsuite** - monitoring różnych platform

---

**Powodzenia w implementacji!** 🎉

*Przykłady przygotowane na bazie projektu ByteClinic*  
*Data: 2025-12-02*