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

// Tidsgräns för hur gammal en sparad token får vara
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dagar

// Helper function for safely accessing auth session
const getSafeAuthSession = () => {
  try {
    // First try using our cross-domain storage helper if available
    if (typeof window !== 'undefined' && window.supabaseStorage) {
      const sessionStr = window.supabaseStorage.getSession();
      if (sessionStr) {
        console.log('Retrieved session from safe storage bridge');
        try {
          // Validera sessionen innan den används
          const session = JSON.parse(sessionStr);
          
          // Kontrollera om sessionen är för gammal
          const timestamp = localStorage.getItem('supabase.auth.token.timestamp');
          if (timestamp) {
            const storedTime = parseInt(timestamp, 10);
            const now = Date.now();
            
            // Om token är äldre än max-åldern, rensa den
            if (now - storedTime > TOKEN_MAX_AGE_MS) {
              console.log('Rensade gammal auth token (>7 dagar)');
              
              if (window.supabaseStorage) {
                window.supabaseStorage.clearSession();
              }
              
              try {
                localStorage.removeItem('supabase.auth.token');
                localStorage.removeItem('supabase.auth.token.timestamp');
              } catch (e) {
                console.warn('Kunde inte rensa localStorage:', e);
              }
              
              return null;
            }
          }
          
          // Kontrollera om token har gått ut baserat på expires_at
          if (session && session.expires_at) {
            const expiresAt = new Date(session.expires_at).getTime();
            const now = Date.now();
            
            if (now >= expiresAt) {
              console.log('Rensade utgången token');
              
              if (window.supabaseStorage) {
                window.supabaseStorage.clearSession();
              }
              
              try {
                localStorage.removeItem('supabase.auth.token');
                localStorage.removeItem('supabase.auth.token.timestamp');
              } catch (e) {
                console.warn('Kunde inte rensa localStorage:', e);
              }
              
              return null;
            }
          }
          
          return session;
        } catch (e) {
          console.warn('Ogiltigt session-format:', e);
          
          // Rensa ogiltig session
          if (window.supabaseStorage) {
            window.supabaseStorage.clearSession();
          }
          
          return null;
        }
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
        // Försök städa upp potentiellt korrupta sessioner först
        if (typeof window !== 'undefined') {
          try {
            // Rensa cachade tokens om de är äldre än max-åldern
            const timestamp = localStorage.getItem('supabase.auth.token.timestamp');
            if (timestamp) {
              const storedTime = parseInt(timestamp, 10);
              const now = Date.now();
              
              // Om token är äldre än 7 dagar, rensa den
              if (now - storedTime > TOKEN_MAX_AGE_MS) {
                console.log('Rensade gammal auth token (>7 dagar)');
                try {
                  localStorage.removeItem('supabase.auth.token');
                  localStorage.removeItem('supabase.auth.token.timestamp');
                } catch (e) {
                  console.warn('Kunde inte rensa localStorage:', e);
                }
                
                if (window.supabaseStorage) {
                  window.supabaseStorage.clearSession();
                }
              }
            } else {
              // Sätt timestamp om det inte finns
              try {
                localStorage.setItem('supabase.auth.token.timestamp', Date.now().toString());
              } catch (e) {
                console.warn('Kunde inte spara timestamp:', e);
              }
            }
          } catch (e) {
            console.warn('Kunde inte kontrollera token-ålder:', e);
          }
        }
        
        // First try our safe storage helper
        const safeSession = getSafeAuthSession();
        
        if (safeSession) {
          console.log('Using cached session from safe storage');
          setSession(safeSession);
          setUser(safeSession?.user ?? null);
          
          // Säkerställ att användarprofilen finns
          if (safeSession?.user?.id && safeSession?.user?.email) {
            createUserProfileIfNeeded(safeSession.user.id, safeSession.user.email);
          }
          
          // Verifiera att sessionen fortfarande är giltig genom att anropa getUser
          try {
            const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !freshUser) {
              console.log('Sparad session är ogiltig, loggar ut och ryddar lokalt');
              await supabase.auth.signOut();
              if (typeof window !== 'undefined') {
                try {
                  localStorage.removeItem('supabase.auth.token');
                  localStorage.removeItem('supabase.auth.token.timestamp');
                } catch (e) {
                  console.warn('Kunde inte rensa localStorage:', e);
                }
                
                if (window.supabaseStorage) {
                  window.supabaseStorage.clearSession();
                }
              }
              setSession(null);
              setUser(null);
            } else {
              // Sessionen är giltig, uppdatera user med den färska datan
              setUser(freshUser);
              
              // Säkerställ att användarprofilen finns
              if (freshUser.id && freshUser.email) {
                createUserProfileIfNeeded(freshUser.id, freshUser.email);
              }
            }
          } catch (verifyError) {
            console.warn('Kunde inte verifiera användarsession:', verifyError);
          }
          
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
          
          // Säkerställ att användarprofilen finns
          if (session?.user?.id && session?.user?.email) {
            createUserProfileIfNeeded(session.user.id, session.user.email);
          }
          
          // Store in our safe storage if available and save timestamp
          if (session && typeof window !== 'undefined') {
            if (window.supabaseStorage) {
              window.supabaseStorage.setSession(JSON.stringify(session));
            }
            try {
              localStorage.setItem('supabase.auth.token.timestamp', Date.now().toString());
            } catch (e) {
              console.warn('Kunde inte spara token timestamp:', e);
            }
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
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Säkerställ att användarprofilen finns
          if (session?.user?.id && session?.user?.email) {
            createUserProfileIfNeeded(session.user.id, session.user.email);
          }
          
          // Store session in safe storage on changes and update timestamp
          if (session && typeof window !== 'undefined') {
            if (window.supabaseStorage) {
              window.supabaseStorage.setSession(JSON.stringify(session));
            }
            try {
              localStorage.setItem('supabase.auth.token.timestamp', Date.now().toString());
            } catch (e) {
              console.warn('Kunde inte spara token timestamp:', e);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          
          // Rensa sessioner vid utloggning
          if (typeof window !== 'undefined') {
            if (window.supabaseStorage) {
              window.supabaseStorage.clearSession();
            }
            try {
              localStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('supabase.auth.token.timestamp');
            } catch (e) {
              console.warn('Kunde inte rensa localStorage:', e);
            }
          }
        }
        
        setIsLoading(false);
      }
    );

    setData();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [createUserProfileIfNeeded]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.session && data.user && !error) {
      // Säkerställ att användarprofilen finns direkt efter inloggning
      createUserProfileIfNeeded(data.user.id, data.user.email);
    }

    return { data: data.session, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // OBS: Vi skapar inte profilen här eftersom användarens e-post måste 
    // verifieras först. Profilen skapas istället vid SIGNED_IN-eventet.

    return { data: data.session, error };
  };

  const signOut = async () => {
    // Rensa eventuella sparade sessioner innan utloggning
    if (typeof window !== 'undefined') {
      if (window.supabaseStorage) {
        window.supabaseStorage.clearSession();
      }
      
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.token.timestamp');
      } catch (e) {
        console.warn('Kunde inte rensa localStorage:', e);
      }
    }
    
    await supabase.auth.signOut();
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
