
import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import StickyCTA from '@/components/layout/StickyCTA';
import CookieBanner from '@/components/layout/CookieBanner';
import ScrollToTop from '@/components/ScrollToTop';
import { Toaster } from '@/components/ui/toaster';

import Home from '@/pages/Home';
import Services from '@/pages/Services';
import Projects from '@/pages/Projects';
import ProjectPost from '@/pages/ProjectPost';
import Lab from '@/pages/Lab';
import LabDownloads from '@/pages/LabDownloads';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import Contact from '@/pages/Contact';
import Cats from '@/pages/Cats';
import Moto from '@/pages/Moto';
import TicketStatus from '@/pages/TicketStatus';
import AdminTickets from '@/pages/AdminTickets';
import AuthPage from '@/pages/AuthPage';
import CustomerPanel from '@/pages/CustomerPanel';
import ReviewsPage from '@/pages/ReviewsPage';
import AdminModeration from '@/pages/AdminModeration';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import TicketDetails from '@/pages/TicketDetails';
import Store from '@/pages/Store';
import ProductDetailPage from '@/pages/ProductDetailPage';
import SuccessPage from '@/pages/SuccessPage';
import AdminServices from '@/pages/AdminServices';
import UserManagement from '@/pages/UserManagement';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Terms from '@/pages/Terms';
import Pricing from '@/pages/Pricing';
import About from '@/pages/About';
import Booking from '@/pages/Booking';
import TrackRepairs from '@/pages/TrackRepairs';

// Error Boundary dla debugowania
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '50px', 
          backgroundColor: 'red', 
          color: 'white',
          minHeight: '100vh',
          fontSize: '18px'
        }}>
          <h1>Błąd w aplikacji:</h1>
          <pre style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '20px' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: 'white', 
              color: 'red',
              border: 'none',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Odśwież stronę
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const location = useLocation();

  return (
    <HelmetProvider>
      <ErrorBoundary>
      <div className="bg-background text-foreground font-sans flex flex-col min-h-screen relative">
      <a href="#main-content" className="skip-link">Pomiń do treści</a>
      <Helmet>
        <title>ByteClinic - Serwis, który ogarnia temat</title>
        <meta name="description" content="ByteClinic - Diagnoza online, projekty IoT i domowy lab. Krótko, konkretnie i po inżyniersku." />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "ByteClinic",
            "url": "https://www.byteclinic.pl",
            "image": "/og.jpg",
            "telephone": "+48 724 316 523",
            "areaServed": "PL",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "PL"
            }
          }
        `}</script>
      </Helmet>
      <div className="background-glow"></div>
      <div className="scanline-overlay"></div>
      <div className="noise-overlay"></div>
      
      <Header />
      <ScrollToTop />
      
      <main id="main-content" role="main" className="flex-grow container mx-auto px-4 py-8 md:py-16 z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/o-nas" element={<About />} />
            <Route path="/uslugi" element={<Services />} />
            <Route path="/projekty" element={<Projects />} />
            <Route path="/projekty/:slug" element={<ProjectPost />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/lab/przegladaj" element={<Lab />} />
            <Route path="/lab/downloads" element={<LabDownloads />} />
            {/* Skrypty removed */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/moto" element={<Moto />} />
            <Route path="/kontakt" element={<Contact />} />
            <Route path="/zglos" element={<Navigate to="/kontakt" />} />
            <Route path="/koty" element={<Cats />} />
            <Route path="/ticket/:id" element={<TicketStatus />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/opinie" element={<ReviewsPage />} />
            <Route path="/cennik" element={<Pricing />} />
            <Route path="/sklep" element={<Store />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/polityka-prywatnosci" element={<PrivacyPolicy />} />
            <Route path="/regulamin" element={<Terms />} />
            <Route path="/rezerwacja" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
            <Route path="/sledzenie" element={<ProtectedRoute><TrackRepairs /></ProtectedRoute>} />
            
            <Route path="/panel" element={<ProtectedRoute><CustomerPanel /></ProtectedRoute>} />
            <Route path="/panel/zgloszenia/:id" element={<ProtectedRoute><TicketDetails /></ProtectedRoute>} />
            <Route path="/admin/tickets" element={<ProtectedRoute adminOnly><AdminTickets /></ProtectedRoute>} />
            <Route path="/admin/moderacja" element={<ProtectedRoute adminOnly><AdminModeration /></ProtectedRoute>} />
            <Route path="/admin/uslugi" element={<ProtectedRoute adminOnly><AdminServices /></ProtectedRoute>} />
            <Route path="/admin/uzytkownicy" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </main>
      
      <Footer />
      <StickyCTA />
      <CookieBanner />
      <Toaster />
      </div>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
