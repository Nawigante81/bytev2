import React, { createContext, useContext, useState, useMemo } from 'react';

// Fallback AuthContext bez Supabase dla testów
const AuthContext = createContext(undefined);

export const TestAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const value = useMemo(() => ({
    user,
    loading,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    profile: null,
    session: null,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};