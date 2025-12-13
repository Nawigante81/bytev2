
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { CartProvider } from '@/hooks/useCart';
import { isSupabaseConfigured, supabaseConfigError } from '@/lib/supabaseClient';

const SupabaseMissingScreen = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <div className="max-w-xl w-full rounded-lg border border-border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Brakuje konfiguracji Supabase</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {supabaseConfigError}
      </p>
      <div className="mt-4 text-sm">
        <div className="font-medium">Szybka naprawa:</div>
        <ol className="mt-2 list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>Skopiuj plik <code>.env.example</code> do <code>.env</code> w katalogu projektu.</li>
          <li>Uzupełnij <code>VITE_SUPABASE_URL</code> i <code>VITE_SUPABASE_ANON_KEY</code> z Supabase → Settings → API.</li>
          <li>Zrestartuj dev serwer Vite.</li>
        </ol>
      </div>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <HelmetProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    ) : (
      <SupabaseMissingScreen />
    )}
  </React.StrictMode>
);
  
