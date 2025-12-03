
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    if (currentUser) {
      let userProfile = await fetchProfile(currentUser.id);
      // Jeśli brak profilu, spróbuj utworzyć go po stronie aplikacji (wymaga polityk RLS INSERT na profiles)
      if (!userProfile) {
        const displayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Użytkownik';
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: currentUser.id,
          display_name: displayName,
          role: 'user',
        }, { onConflict: 'id' });
        if (!upsertErr) {
          userProfile = await fetchProfile(currentUser.id);
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
        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'USER_UPDATED') {
          console.log('User updated');
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery');
        }
        
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/panel`,
        data: {
          email,
          ...(options?.data || {})
        },
        ...options,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Błąd rejestracji",
        description: error.message || "Coś poszło nie tak",
      });
    } else {
      toast({
        title: "Rejestracja udana!",
        description: "Sprawdź e-mail, aby potwierdzić konto.",
      });
      
      // Log success for debugging (only in development)
      if (import.meta.env.DEV) {
        console.log('User signed up successfully. Email confirmation sent.');
        if (data?.user && !data.user.email_confirmed_at) {
          console.log('Email confirmation required. User should check their inbox.');
        }
      }
    }

    return { data, error };
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
      toast({
        variant: "destructive",
        title: "Błąd wylogowania",
        description: error.message || "Coś poszło nie tak",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signInWithOtp,
    signOut,
  }), [user, session, profile, loading, signUp, signIn, signInWithOAuth, signInWithOtp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
