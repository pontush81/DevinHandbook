"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

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

// Helper function for safely accessing auth session
const getSafeAuthSession = () => {
  try {
    // First try using our cross-domain storage helper if available
    if (typeof window !== 'undefined' && window.supabaseStorage) {
      const sessionStr = window.supabaseStorage.getSession();
      if (sessionStr) {
        console.log('Retrieved session from safe storage bridge');
        return JSON.parse(sessionStr);
      }
    }
    // Fallback to direct localStorage in try-catch
    if (typeof window !== 'undefined') {
      try {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (sessionStr) {
          console.log('Retrieved session from localStorage directly');
          return JSON.parse(sessionStr);
        }
      } catch (e) {
        console.warn('Local storage access failed:', e);
      }
    }
    return null;
  } catch (e) {
    console.error('Error retrieving auth session:', e);
    return null;
  }
};

// Försök hämta sessionen från localStorage
const getSessionFromStorage = () => {
  try {
    // Försök först med safeStorage om det finns
    if (typeof window !== 'undefined' && window.safeStorage) {
      const sessionStr = window.safeStorage.getItem('supabase.auth.token');
      if (sessionStr) {
        console.log('Retrieved session from safeStorage');
        return JSON.parse(sessionStr);
      }
    }
    
    // Fallback to direct localStorage in try-catch
    if (typeof window !== 'undefined') {
      try {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (sessionStr) {
          console.log('Retrieved session from localStorage directly');
          return JSON.parse(sessionStr);
        }
      } catch (e) {
        console.warn('Could not access localStorage directly', e);
      }
    }
  } catch (error) {
    console.error('Error retrieving session from storage:', error);
  }
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const setData = async () => {
      try {
        // First try our safe storage helper
        const safeSession = getSafeAuthSession();
        
        if (safeSession) {
          console.log('Using cached session from safe storage');
          setSession(safeSession);
          setUser(safeSession?.user ?? null);
          setIsLoading(false);
          return;
        }
        
        // Fallback to Supabase's built-in getSession
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Supabase auth error:', error);
          setSession(null);
          setUser(null);
        } else {
          console.log('Retrieved fresh session from Supabase');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Store in our safe storage if available
          if (session && typeof window !== 'undefined' && window.supabaseStorage) {
            window.supabaseStorage.setSession(JSON.stringify(session));
          }
        }
      } catch (e) {
        console.error('Error in auth initialization:', e);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Store session in safe storage on changes
        if (session && typeof window !== 'undefined' && window.supabaseStorage) {
          window.supabaseStorage.setSession(JSON.stringify(session));
        } else if (!session && typeof window !== 'undefined' && window.supabaseStorage) {
          window.supabaseStorage.clearSession();
        }
      }
    );

    setData();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data: data.session, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { data: data.session, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    
    // Also clear our safe storage
    if (typeof window !== 'undefined' && window.supabaseStorage) {
      window.supabaseStorage.clearSession();
    }
    
    router.push("/");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { data: { user: null }, error };
  };

  const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    return { data: { user: data.user }, error };
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    
    const userRoles = user.app_metadata?.roles || [];
    return Array.isArray(userRoles) && userRoles.includes(role);
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
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
