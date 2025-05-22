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
          const timestamp = window.safeStorage?.getItem('supabase.auth.token.timestamp');
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
                if (window.safeStorage) {
                  window.safeStorage.removeItem('supabase.auth.token');
                  window.safeStorage.removeItem('supabase.auth.token.timestamp');
                } else {
                  localStorage.removeItem('supabase.auth.token');
                  localStorage.removeItem('supabase.auth.token.timestamp');
                }
              } catch (e) {
                console.warn('Kunde inte rensa storage:', e);
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
                if (window.safeStorage) {
                  window.safeStorage.removeItem('supabase.auth.token');
                  window.safeStorage.removeItem('supabase.auth.token.timestamp');
                } else {
                  localStorage.removeItem('supabase.auth.token');
                  localStorage.removeItem('supabase.auth.token.timestamp');
                }
              } catch (e) {
                console.warn('Kunde inte rensa storage:', e);
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
    
    // Fallback to direct localStorage or safeStorage in try-catch
    if (typeof window !== 'undefined') {
      try {
        // Försök först med safeStorage om det finns
        if (window.safeStorage) {
          const sessionStr = window.safeStorage.getItem('supabase.auth.token');
          if (sessionStr) {
            console.log('Retrieved session from safeStorage');
            return JSON.parse(sessionStr);
          }
        }
        
        // Fallback till vanlig localStorage
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (sessionStr) {
          console.log('Retrieved session from localStorage directly');
          return JSON.parse(sessionStr);
        }
      } catch (e) {
        console.warn('Storage access failed:', e);
      }
    }
    return null;
  } catch (e) {
    console.error('Error retrieving auth session:', e);
    return null;
  }
};

// Helper för att säkert spara session-data
const safeSaveSession = (session: Session | null) => {
  if (!session) return false;
  
  try {
    const sessionStr = JSON.stringify(session);
    
    // Spara i vår cross-domain lösning om tillgänglig
    if (typeof window !== 'undefined' && window.supabaseStorage) {
      window.supabaseStorage.setSession(sessionStr);
    }
    
    // Spara även i safeStorage om tillgänglig
    if (typeof window !== 'undefined' && window.safeStorage) {
      window.safeStorage.setItem('supabase.auth.token', sessionStr);
      window.safeStorage.setItem('supabase.auth.token.timestamp', Date.now().toString());
    }
    
    // Försök även med direkt localStorage som fallback
    try {
      localStorage.setItem('supabase.auth.token', sessionStr);
      localStorage.setItem('supabase.auth.token.timestamp', Date.now().toString());
    } catch (e) {
      console.warn('Direkt localStorage åtkomst misslyckades:', e);
    }
    
    return true;
  } catch (e) {
    console.error('Kunde inte spara session:', e);
    return false;
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
            let timestamp;
            
            if (window.safeStorage) {
              timestamp = window.safeStorage.getItem('supabase.auth.token.timestamp');
            } else {
              try {
                timestamp = localStorage.getItem('supabase.auth.token.timestamp');
              } catch (e) {
                console.warn('Kunde inte läsa timestamp från localStorage:', e);
              }
            }
            
            if (timestamp) {
              const storedTime = parseInt(timestamp, 10);
              const now = Date.now();
              
              // Om token är äldre än 7 dagar, rensa den
              if (now - storedTime > TOKEN_MAX_AGE_MS) {
                console.log('Rensade gammal auth token (>7 dagar)');
                
                // Rensa i alla lagringsmekanismer
                if (window.supabaseStorage) {
                  window.supabaseStorage.clearSession();
                }
                
                if (window.safeStorage) {
                  window.safeStorage.removeItem('supabase.auth.token');
                  window.safeStorage.removeItem('supabase.auth.token.timestamp');
                }
                
                try {
                  localStorage.removeItem('supabase.auth.token');
                  localStorage.removeItem('supabase.auth.token.timestamp');
                } catch (e) {
                  console.warn('Kunde inte rensa localStorage:', e);
                }
              }
            } else {
              // Sätt timestamp om det inte finns
              try {
                const now = Date.now().toString();
                if (window.safeStorage) {
                  window.safeStorage.setItem('supabase.auth.token.timestamp', now);
                }
                
                try {
                  localStorage.setItem('supabase.auth.token.timestamp', now);
                } catch (e) {
                  console.warn('Kunde inte spara timestamp i localStorage:', e);
                }
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
              
              // Rensa i alla lagringsmekanismer
              if (window.supabaseStorage) {
                window.supabaseStorage.clearSession();
              }
              
              if (window.safeStorage) {
                window.safeStorage.removeItem('supabase.auth.token');
                window.safeStorage.removeItem('supabase.auth.token.timestamp');
              }
              
              try {
                localStorage.removeItem('supabase.auth.token');
                localStorage.removeItem('supabase.auth.token.timestamp');
              } catch (e) {
                console.warn('Kunde inte rensa localStorage:', e);
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
            console.error('Fel vid verifiering av session:', verifyError);
          }
        } else {
          // Ingen cachad session, försök hämta från Supabase
          const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Fel vid hämtning av session:', sessionError);
          } else if (freshSession) {
            console.log('Hittade aktiv session från Supabase');
            setSession(freshSession);
            setUser(freshSession.user);
            
            // Spara i vår säkra lagring
            safeSaveSession(freshSession);
            
            // Säkerställ att användarprofilen finns
            if (freshSession.user.id && freshSession.user.email) {
              createUserProfileIfNeeded(freshSession.user.id, freshSession.user.email);
            }
          } else {
            console.log('Ingen aktiv session hittades');
            setSession(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error('Fel vid inläsning av auth-status:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    setData();
    
    // Lyssna på auth-ändringar
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed');
        
        // Uppdatera state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Spara i vår säkra lagring
        safeSaveSession(session);
        
        // Säkerställ att användarprofilen finns
        if (session?.user?.id && session?.user?.email) {
          createUserProfileIfNeeded(session.user.id, session.user.email);
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        
        // Använd Supabase:s inbyggda metoder för att rensa session
        try {
          if (window.supabaseStorage) {
            window.supabaseStorage.clearSession();
          }
          
          if (window.safeStorage) {
            window.safeStorage.removeItem('supabase.auth.token');
            window.safeStorage.removeItem('supabase.auth.token.timestamp');
          }
          
          // Undvik direkt åtkomst till localStorage/sessionStorage
          // Supabase kommer att hantera detta med cookies istället
        } catch (e) {
          console.warn('Kunde inte rensa lagringsmekanismer:', e);
        }
        
        setSession(null);
        setUser(null);
      }
    });
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router, createUserProfileIfNeeded]);

  // Implementera de olika auth-funktionerna
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (data.session) {
        // Spara i vår säkra lagring
        safeSaveSession(data.session);
      }
      
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
    await supabase.auth.signOut();
    
    // Använd Supabase:s inbyggda metoder för att rensa session
    try {
      if (window.supabaseStorage) {
        window.supabaseStorage.clearSession();
      }
      
      if (window.safeStorage) {
        window.safeStorage.removeItem('supabase.auth.token');
        window.safeStorage.removeItem('supabase.auth.token.timestamp');
      }
      
      // Undvik direkt åtkomst till localStorage/sessionStorage
      // Supabase kommer att hantera detta med cookies istället
    } catch (e) {
      console.warn('Kunde inte rensa lagringsmekanismer:', e);
    }
    
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
