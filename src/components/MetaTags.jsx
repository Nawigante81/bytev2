import React from 'react';
import { Helmet } from 'react-helmet-async';

const MetaTags = ({
  title,
  description,
  image = '/og.png',
  url,
  type = 'website',
  siteName = 'ByteClinic',
  locale = 'pl_PL',
  twitterSite = '@ByteClinic',
  canonical,
  publishedTime,
  modifiedTime,
  author,
  section,
  price,
  currency = 'PLN',
  fbAppId
}) => {
  const currentUrl = url || (typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://www.byteclinic.pl/');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:locale" content={locale} />
      {fbAppId && <meta property="fb:app_id" content={fbAppId} />}
      
      {/* Open Graph - Image details */}
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterSite} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* Article specific (when type is article) */}
      {type === 'article' && (
        <>
          <meta property="article:author" content={author || siteName} />
          <meta property="article:publisher" content={currentUrl} />
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {section && <meta property="article:section" content={section} />}
        </>
      )}
      
      {/* Product specific (when type is product) */}
      {type === 'product' && (
        <>
          {price && <meta property="product:price:amount" content={price} />}
          <meta property="product:price:currency" content={currency} />
          <meta property="product:availability" content="in stock" />
          <meta property="product:brand" content={siteName} />
        </>
      )}
      
      {/* Business specific tags */}
      {type === 'website' && (
        <>
          <meta property="business:contact_data:phone_number" content="+48724316523" />
          <meta property="business:contact_data:website" content="https://www.byteclinic.pl" />
          <meta property="business:contact_data:street_address" content="ul. Przykładowa 123" />
          <meta property="business:contact_data:locality" content="Zgorzelec" />
          <meta property="business:contact_data:postal_code" content="59-900" />
          <meta property="business:contact_data:country_name" content="Polska" />
        </>
      )}
      
      {/* Structured Data JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": type === 'article' ? 'Article' : type === 'product' ? 'Product' : 'WebPage',
          "headline": title,
          "description": description,
          "image": image,
          "url": currentUrl,
          "author": type === 'article' ? {
            "@type": "Person",
            "name": author || siteName
          } : undefined,
          "publisher": {
            "@type": "Organization",
            "name": siteName,
            "logo": {
              "@type": "ImageObject",
              "url": "https://www.byteclinic.pl/logo.png",
              "width": 200,
              "height": 60
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+48724316523",
              "contactType": "customer service"
            },
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "ul. Przykładowa 123",
              "addressLocality": "Zgorzelec",
              "postalCode": "59-900",
              "addressCountry": "PL"
            }
          },
          "price": type === 'product' ? price : undefined,
          "priceCurrency": type === 'product' ? currency : undefined,
          "datePublished": publishedTime,
          "dateModified": modifiedTime,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": currentUrl
          }
        })}
      </script>
      
      {/* Local Business Schema for website */}
      {type === 'website' && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "ByteClinic",
            "image": "https://www.byteclinic.pl/logo.png",
            "url": "https://www.byteclinic.pl",
            "telephone": "+48724316523",
            "email": "kontakt@byteclinic.pl",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "ul. Przykładowa 123",
              "addressLocality": "Zgorzelec",
              "postalCode": "59-900",
              "addressCountry": "PL"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "51.1530",
              "longitude": "15.0086"
            },
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "opens": "09:00",
                "closes": "17:00"
              }
            ],
            "priceRange": "99-299 PLN",
            "paymentAccepted": "Cash, Credit Card, BLIK",
            "currenciesAccepted": "PLN",
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Usługi ByteClinic",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Diagnoza laptop/PC",
                    "description": "Dokładna analiza problemu sprzętowego lub software'owego"
                  },
                  "price": "99",
                  "priceCurrency": "PLN"
                }
              ]
            }
          })}
        </script>
      )}
    </Helmet>
  );
};

export default MetaTags;