"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ensureUserProfile } from "@/lib/user-utils";

declare global {
  interface Window {
    safeLocalStorage?: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => boolean;
      removeItem: (key: string) => boolean;
    };
    supabaseStorage?: {
      getSession: () => string | null;
      setSession: (token: string) => boolean;
      clearSession: () => boolean;
    };
    safeStorage?: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => boolean;
      removeItem: (key: string) => boolean;
    };
  }
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: Session | null;
  }>;
  signUp: (email: string, password: string) => Promise<{
    error: Error | null;
    data: Session | null;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{
    error: Error | null;
    data: { user: null } | null;
  }>;
  updatePassword: (password: string) => Promise<{
    error: Error | null;
    data: { user: unknown } | null;
  }>;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Vi använder nu cookies för sessionshantering
// Inga manuella token-helpers behövs längre

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Funktion för att skapa användarprofil om den inte finns
  const createUserProfileIfNeeded = useCallback(async (userId: string, email: string) => {
    if (!userId || !email) return;
    
    try {
      await ensureUserProfile(supabase, userId, email);
    } catch (error) {
      console.error('Fel vid profilskapande:', error);
    }
  }, []);

  useEffect(() => {
    const setData = async () => {
      try {
        // Använd Supabase's inbyggda getSession istället för localStorage/cookies
        const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Fel vid hämtning av session:', sessionError);
          setSession(null);
          setUser(null);
        } else if (freshSession) {
          console.log('Hittade aktiv session från Supabase', {
            userId: freshSession.user?.id,
            expiresAt: freshSession.expires_at ? new Date(freshSession.expires_at * 1000).toISOString() : 'unknown'
          });
          setSession(freshSession);
          setUser(freshSession.user);
          
          // Säkerställ att användarprofilen finns
          if (freshSession.user.id && freshSession.user.email) {
            createUserProfileIfNeeded(freshSession.user.id, freshSession.user.email);
          }
        } else {
          console.log('Ingen aktiv session hittades');
          setSession(null);
          setUser(null);
        }
      } catch (e) {
        console.error('Fel vid inläsning av auth-status:', e);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    setData();
    
    // Lyssna på auth-ändringar
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed');
        
        // Uppdatera state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Validera sessionscookie
        if (typeof document !== 'undefined') {
          console.log('Cookie status:', {
            hasCookies: document.cookie.includes('sb-auth'),
            cookies: document.cookie.split(';').map(c => c.trim()).filter(c => c.startsWith('sb-')).join(', ')
          });
        }
        
        // Säkerställ att användarprofilen finns
        if (session?.user?.id && session?.user?.email) {
          createUserProfileIfNeeded(session.user.id, session.user.email);
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setSession(null);
        setUser(null);
      }
    });
    
    // Periodiskt kontrollera att sessionen fortfarande är aktiv
    const sessionCheck = setInterval(async () => {
      if (session) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          console.warn('Session försvann vid periodisk kontroll');
          setSession(null);
          setUser(null);
        }
      }
    }, 30000); // Kontrollera var 30:e sekund
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
      clearInterval(sessionCheck);
    };
  }, [router, createUserProfileIfNeeded]);

  // Implementera de olika auth-funktionerna
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { data: data.session, error };
    } catch (error) {
      console.error('Fel vid inloggning:', error);
      return { data: null, error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      return { data: data.session, error };
    } catch (error) {
      console.error('Fel vid registrering:', error);
      return { data: null, error: error as Error };
    }
  };

  const signOut = async () => {
    // Låt Supabase hantera utloggningen och rensning av cookies
    await supabase.auth.signOut();
    
    setSession(null);
    setUser(null);
    router.push("/");
  };

  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
  };

  const updatePassword = async (password: string) => {
    return await supabase.auth.updateUser({ password });
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    
    // Kontrollera om användaren är superadmin
    if (user.app_metadata?.is_superadmin === true) {
      return true;
    }
    
    // Kontrollera roller i app_metadata
    const roles = user.app_metadata?.roles || [];
    if (Array.isArray(roles) && roles.includes(role)) {
      return true;
    }
    
    return false;
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
