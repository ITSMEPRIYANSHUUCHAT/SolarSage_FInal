
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  guestPdfCount: number;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  enterGuestMode: () => void;
  incrementGuestPdfCount: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestPdfCount, setGuestPdfCount] = useState(0);

  useEffect(() => {
    // Check for guest mode in localStorage
    const guestMode = localStorage.getItem('guest_mode');
    const pdfCount = parseInt(localStorage.getItem('guest_pdf_count') || '0');
    
    if (guestMode === 'true') {
      setIsGuest(true);
      setGuestPdfCount(pdfCount);
      setLoading(false);
      return;
    }

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsGuest(false);
        setLoading(false);
        
        // Clear guest mode when user logs in
        if (session) {
          localStorage.removeItem('guest_mode');
          localStorage.removeItem('guest_pdf_count');
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: fullName ? { full_name: fullName } : undefined
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    setGuestPdfCount(0);
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_pdf_count', '0');
  };

  const incrementGuestPdfCount = () => {
    const newCount = guestPdfCount + 1;
    setGuestPdfCount(newCount);
    localStorage.setItem('guest_pdf_count', newCount.toString());
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    setGuestPdfCount(0);
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_pdf_count');
  };

  const value = {
    user,
    session,
    loading,
    isGuest,
    guestPdfCount,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    enterGuestMode,
    incrementGuestPdfCount,
    exitGuestMode
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
