"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ensureUserProfile } from "@/lib/user-utils";
import { logDiagnostic, snapshotSession, snapshotCookies } from "@/lib/auth-diagnostics";

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

// Vi använder nu ENDAST cookies för sessionshantering via Supabase

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

  // Funktion för att hantera auth-relaterade fel på ett konsistent sätt
  const handleAuthErrors = useCallback((error: any) => {
    if (!error) return;
    
    // Extrahera felmeddelande från olika möjliga format
    const errorMessage = typeof error === 'string' 
      ? error 
      : error.message || (error.error && error.error.message) || '';
    
    logDiagnostic('error', 'Supabase auth error', { error: errorMessage });
    console.error('Supabase auth error:', errorMessage);
    
    // Kontrollera för sessionsrelaterade fel
    if (
      errorMessage.includes('refresh_token_not_found') || 
      errorMessage.includes('invalid session') || 
      errorMessage.includes('JWT expired') ||
      errorMessage.includes('Invalid refresh token')
    ) {
      logDiagnostic('error', 'Sessionsfel detekterat, loggar ut användare', { message: errorMessage });
      console.warn('Sessionsfel detekterat, loggar ut användare:', errorMessage);
      
      // Rensa session/user state
      setSession(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const setData = async () => {
      try {
        // Använd Supabase's inbyggda getSession istället för localStorage/cookies
        logDiagnostic('auth', 'Kontrollerar initial session...');
        const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Fel vid hämtning av session:', sessionError);
          logDiagnostic('error', 'Fel vid hämtning av initial session', { error: sessionError });
          setSession(null);
          setUser(null);
        } else if (freshSession) {
          logDiagnostic('session', 'Hittade aktiv session', {
            userId: freshSession.user?.id,
            expiresAt: freshSession.expires_at ? new Date(freshSession.expires_at * 1000).toISOString() : 'unknown'
          });
          console.log('Hittade aktiv session från Supabase', {
            userId: freshSession.user?.id,
            expiresAt: freshSession.expires_at ? new Date(freshSession.expires_at * 1000).toISOString() : 'unknown'
          });
          
          // Ta snapshot av sessionen för diagnostik
          snapshotSession(freshSession);
          
          setSession(freshSession);
          setUser(freshSession.user);
          
          // Säkerställ att användarprofilen finns
          if (freshSession.user.id && freshSession.user.email) {
            createUserProfileIfNeeded(freshSession.user.id, freshSession.user.email);
          }
        } else {
          logDiagnostic('session', 'Ingen aktiv session hittades');
          console.log('Ingen aktiv session hittades');
          setSession(null);
          setUser(null);
        }
        
        // Ta snapshot av cookies för diagnostik
        snapshotCookies();
      } catch (e) {
        console.error('Fel vid inläsning av auth-status:', e);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    // För att säkerställa att cookies har laddats korrekt, vänta lite innan vi försöker hämta session
    const timeout = setTimeout(() => {
      setData();
    }, 800); // Ökad till 800ms för att ge browsern mycket mer tid för cookies
    
    // Rensa timeout när komponenten avmonteras
    return () => clearTimeout(timeout);
  }, [createUserProfileIfNeeded]);

  // Separat useEffect för lyssnare för att undvika race conditions
  useEffect(() => {
    // Lyssna på auth-ändringar
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      logDiagnostic('auth', `Auth state change: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });
      
      console.log('Auth state change:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        logDiagnostic('auth', 'User signed in or token refreshed');
        console.log('User signed in or token refreshed');
        
        // Ta snapshot av session för diagnostik
        if (session) {
          snapshotSession(session);
        }
        
        // Uppdatera state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Validera sessionscookie
        if (typeof document !== 'undefined') {
          const cookieInfo = {
            hasCookies: document.cookie.includes('sb-auth'),
            cookies: document.cookie.split(';').map(c => c.trim()).filter(c => c.startsWith('sb-')).join(', ')
          };
          
          logDiagnostic('cookie', 'Cookie status efter auth-ändring', cookieInfo);
          console.log('Cookie status:', cookieInfo);
          
          // Ta snapshot av cookies för diagnostik
          snapshotCookies();
        }
        
        // Säkerställ att användarprofilen finns
        if (session?.user?.id && session?.user?.email) {
          createUserProfileIfNeeded(session.user.id, session.user.email);
        }
      }
      
      if (event === 'SIGNED_OUT') {
        logDiagnostic('auth', 'User signed out');
        console.log('User signed out');
        setSession(null);
        setUser(null);
        
        // Ta snapshot av cookies efter utloggning
        snapshotCookies();
      }
      
      // Hantera sessionsfel
      if (event === 'TOKEN_REFRESHED' && !session) {
        logDiagnostic('error', 'Token refresh misslyckades utan session');
        console.warn('Token refresh misslyckades utan session');
        setSession(null);
        setUser(null);
      }
      
      // Hantera när användarsessionen blir ogiltig
      if (event === 'USER_UPDATED' && !session) {
        logDiagnostic('error', 'Användare uppdaterad men session saknas');
        console.warn('Användare uppdaterad men session saknas');
        setSession(null);
        setUser(null);
      }
    });
    
    // Hantera auth-fel via custom event
    const handleAuthError = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        handleAuthErrors(customEvent.detail?.error || customEvent.detail);
      } catch (e) {
        console.error('Fel vid hantering av auth error event:', e);
      }
    };
    
    // Försök att registrera onError-event om det finns, annars använd vanlig event listener
    let errorUnsubscribe: any = null;
    
    try {
      // Försök använda onError om det finns (vissa Supabase-versioner stödjer detta)
      if (typeof supabase.auth.onError === 'function') {
        // @ts-ignore - Ignorera typfel för äldre Supabase-versioner
        errorUnsubscribe = supabase.auth.onError((error: any) => {
          try {
            handleAuthErrors(error);
          } catch (e) {
            console.error('Fel i onError-hanterare:', e);
          }
        });
        console.log('Registrerade supabase.auth.onError - API tillgängligt');
      } else {
        // Fallback: lägg till global event listener för auth-fel
        if (typeof window !== 'undefined') {
          window.addEventListener('supabase.auth.error', handleAuthError);
          console.log('Registrerade event listener för supabase.auth.error');
        }
      }
    } catch (e) {
      console.error('Fel vid registrering av auth error hanterare:', e);
      // Fallback: lägg till global event listener för auth-fel om något går fel
      if (typeof window !== 'undefined') {
        window.addEventListener('supabase.auth.error', handleAuthError);
        console.log('Fallback: Registrerade event listener för supabase.auth.error');
      }
    }
    
    // Periodiskt kontrollera att sessionen fortfarande är aktiv
    const sessionCheck = setInterval(async () => {
      if (session) {
        try {
          // Använd ett begränsat antal försök för sessionskontroll
          const checkWithRetry = async (maxRetries = 2) => {
            for (let i = 0; i < maxRetries; i++) {
              try {
                const { data, error } = await supabase.auth.getSession();
                
                if (error) {
                  // Hantera felet med vår gemensamma funktion
                  handleAuthErrors(error);
                  
                  // Om det är ett nätverksfel, försök igen
                  if (error.message?.includes('network') || error.message?.includes('connection')) {
                    console.warn(`Nätverksfel vid sessionskontroll (försök ${i+1}/${maxRetries}):`, error.message);
                    if (i < maxRetries - 1) {
                      // Vänta innan nästa försök (500ms första gången, 1000ms andra)
                      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                      continue;
                    }
                  }
                  
                  // Permanent sessionsfel
                  console.warn('Sessionsfel vid periodisk kontroll:', error.message);
                  setSession(null);
                  setUser(null);
                  return;
                }
                
                if (!data.session) {
                  console.warn('Session försvann vid periodisk kontroll - ingen session hittades');
                  setSession(null);
                  setUser(null);
                }
                
                // Lyckad kontroll, avbryt retry-loop
                return;
              } catch (err) {
                console.error(`Oväntat fel vid sessionskontroll (försök ${i+1}/${maxRetries}):`, err);
                if (i === maxRetries - 1) {
                  // Vid upprepade fel, hantera graciöst utan att logga ut användaren
                  // Vi försöker igen vid nästa intervallkontroll
                  return;
                }
                // Vänta innan nästa försök
                await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
              }
            }
          };
          
          await checkWithRetry();
        } catch (err) {
          // Yttre catch - bör aldrig nås på grund av inre try/catch
          console.error('Kritiskt fel vid sessionskontroll:', err);
        }
      }
    }, 30000); // Kontrollera var 30:e sekund
    
    return () => {
      // Städa upp auth-lyssnare
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
      
      // Städa upp error-lyssnare
      if (errorUnsubscribe && errorUnsubscribe.subscription) {
        errorUnsubscribe.subscription.unsubscribe();
      } else if (typeof window !== 'undefined') {
        // Alternativt ta bort event listener
        window.removeEventListener('supabase.auth.error', handleAuthError);
      }
      
      clearInterval(sessionCheck);
    };
  }, [createUserProfileIfNeeded, session, handleAuthErrors]);

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
