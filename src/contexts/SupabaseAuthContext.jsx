
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // maybeSingle() zwraca null zamiast błędu gdy nie ma wierszy
      if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Tabela profiles może nie istnieć:', err);
      return null;
    }
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    if (currentUser) {
      let userProfile = await fetchProfile(currentUser.id);
      // Jeśli brak profilu, spróbuj utworzyć go po stronie aplikacji (wymaga polityk RLS INSERT na profiles)
      if (!userProfile) {
        try {
          const fullName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Użytkownik';
          const { error: upsertErr } = await supabase.from('profiles').upsert({
            id: currentUser.id,
            full_name: fullName,
            role: 'user',
          }, { onConflict: 'id' });
          if (!upsertErr) {
            userProfile = await fetchProfile(currentUser.id);
          }
        } catch (upsertError) {
          console.warn('Nie można utworzyć profilu - tabela profiles może nie istnieć:', upsertError);
          // Utwórz minimalny profil w pamięci
          userProfile = {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Użytkownik',
            role: 'user',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      }
      setProfile(userProfile || null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/panel`,
        ...options,
      },
    });

    if (error) {
      // Specyficzne komunikaty dla błędów SMTP i email
      if (error.message.includes('email') || error.message.includes('Email') || error.message.includes('smtp')) {
        toast({
          variant: "destructive",
          title: "Problem z wysyłką email",
          description: "Email confirmation może nie dotrzeć. Spróbuj magiczny link lub skontaktuj się z administratorem.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Błąd rejestracji",
          description: error.message || "Coś poszło nie tak",
        });
      }
    } else {
      toast({
        title: "Rejestracja udana!",
        description: "Sprawdź e-mail (łącznie ze spamem), aby potwierdzić konto.",
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Błąd logowania",
        description: error.message || "Nieprawidłowy e-mail lub hasło.",
      });
    }

    return { error };
  }, [toast]);

  const signInWithOAuth = useCallback(async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/panel`,
      },
    });
    if (error) {
      toast({ variant: "destructive", title: "Błąd logowania OAuth", description: error.message });
    }
  }, [toast]);

  const signInWithOtp = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/panel`,
      },
    });
    if (error) {
      toast({ variant: "destructive", title: "Błąd wysyłania linku", description: error.message });
    } else {
      toast({ title: "Wysłano magiczny link!", description: "Sprawdź swoją skrzynkę e-mail." });
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Obsługa specyficznego błędu "Auth session missing!" - oznacza, że sesja już nie istnieje
      if (error.message === 'Auth session missing!' || error.message.includes('Auth session missing')) {
        // Wyczyść lokalny stan nawet jeśli sesja już nie istnieje
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        
        // Pokaż informacyjny komunikat zamiast błędu
        toast({
          variant: "default",
          title: "Wylogowanie",
          description: "Zostałeś pomyślnie wylogowany.",
        });
        
        return { error: null }; // Traktuj jako pomyślne wylogowanie
      } else {
        // Inne błędy - pokaż standardowy komunikat błędu
        toast({
          variant: "destructive",
          title: "Błąd wylogowania",
          description: error.message || "Coś poszło nie tak",
        });
      }
    } else {
      // Pomyślne wylogowanie - pokaż informacyjny komunikat
      toast({
        variant: "default",
        title: "Wylogowanie",
        description: "Zostałeś pomyślnie wylogowany.",
      });
    }

    return { error };
  }, [toast]);

  const isAdmin = useMemo(() => {
    return profile?.role === 'admin';
  }, [profile]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    isAdmin,
    signUp,
    signIn,
    signInWithOAuth,
    signInWithOtp,
    signOut,
  }), [user, session, profile, loading, isAdmin, signUp, signIn, signInWithOAuth, signInWithOtp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
