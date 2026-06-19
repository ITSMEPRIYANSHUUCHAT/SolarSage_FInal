
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    // Surface OAuth errors returned in the redirect URL (e.g. access denied or
    // a misconfigured provider) then clean them from the address bar.
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError =
      search.get('error_description') || search.get('error') ||
      hash.get('error_description') || hash.get('error');
    if (oauthError) {
      toast.error(decodeURIComponent(oauthError).replace(/\+/g, ' '));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Always set up the auth listener FIRST so OAuth redirects (Google) are
    // processed even if a stale guest_mode flag is in localStorage. A real
    // session always wins over guest mode.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) {
          // Real auth wins — clear any guest state.
          setIsGuest(false);
          setGuestPdfCount(0);
          localStorage.removeItem('guest_mode');
          localStorage.removeItem('guest_pdf_count');
        }
        setLoading(false);
      }
    );

    // Resolve the initial state. detectSessionInUrl handles the OAuth callback,
    // so getSession() returns the freshly-exchanged session after a Google login.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsGuest(false);
      } else if (localStorage.getItem('guest_mode') === 'true') {
        // Only fall back to guest mode when there is no authenticated session.
        setIsGuest(true);
        setGuestPdfCount(parseInt(localStorage.getItem('guest_pdf_count') || '0'));
      }
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
    // Leaving guest mode first so the post-redirect session isn't shadowed by a
    // stale guest flag.
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_pdf_count');
    setIsGuest(false);
    setGuestPdfCount(0);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          // Always show the account chooser rather than silently reusing one.
          prompt: 'select_account',
        },
      },
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
