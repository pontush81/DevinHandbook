"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ensureUserProfile } from "@/lib/user-utils";

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
  refreshAuth: () => Promise<{ success: boolean; message: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Vi använder nu ENDAST cookies för sessionshantering via Supabase

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authErrorShown, setAuthErrorShown] = useState(false);
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
    
    // Kontrollera för sessionsrelaterade fel
    if (
      errorMessage.includes('refresh_token_not_found') || 
      errorMessage.includes('invalid session') || 
      errorMessage.includes('JWT expired') ||
      errorMessage.includes('Invalid refresh token')
    ) {
      // Rensa session/user state
      setSession(null);
      setUser(null);
    }
  }, []);

  // Initiera session från Supabase
  useEffect(() => {
    const setData = async () => {
      console.log('🔄 AuthContext: Initializing auth state...');
      setIsLoading(true);
      
      try {
        // Kontrollera om vi är på klientsidan och har tillgång till storage
        if (typeof window === 'undefined') {
          console.log('🖥️ AuthContext: Running on server, skipping session check');
          setIsLoading(false);
          return;
        }

        // Säker kontroll av storage access
        let hasStorageAccess = false;
        try {
          localStorage.getItem('test');
          hasStorageAccess = true;
        } catch (e) {
          console.warn('⚠️ AuthContext: No storage access, using fallback auth');
          hasStorageAccess = false;
        }

        // Hämta aktuell session
        console.log('📡 AuthContext: Getting current session from Supabase...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        console.log('📊 AuthContext: Session result:', {
          hasSession: !!currentSession,
          hasUser: !!currentSession?.user,
          error: error?.message,
          userId: currentSession?.user?.id,
          email: currentSession?.user?.email
        });
        
        if (error) {
          console.error('❌ AuthContext: Error getting session:', error);
          
          // Försök återställa session från cookies om det finns och vi har storage access
          if (hasStorageAccess && typeof document !== 'undefined' && document.cookie.includes('sb-auth')) {
            console.log('🍪 AuthContext: Found auth cookies, attempting session restore...');
            
            // Vänta lite och försök igen
            setTimeout(async () => {
              try {
                const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
                console.log('🔄 AuthContext: Retry session result:', {
                  hasSession: !!retrySession,
                  hasUser: !!retrySession?.user,
                  error: retryError?.message
                });
                
                if (!retryError && retrySession) {
                  console.log('✅ AuthContext: Session restored from cookies');
                  setSession(retrySession);
                  setUser(retrySession.user);
                  
                  if (retrySession.user.id && retrySession.user.email) {
                    createUserProfileIfNeeded(retrySession.user.id, retrySession.user.email);
                  }
                } else {
                  console.log('❌ AuthContext: Failed to restore session from cookies');
                  setSession(null);
                  setUser(null);
                }
              } catch (e) {
                console.error('❌ AuthContext: Error during session restore:', e);
                setSession(null);
                setUser(null);
              } finally {
                setIsLoading(false);
              }
            }, 1000);
            return; // Avsluta här för att vänta på retry
          } else {
            console.log('🚫 AuthContext: No auth cookies found or no storage access');
            setSession(null);
            setUser(null);
          }
        } else if (currentSession) {
          console.log('✅ AuthContext: Found active session', {
            userId: currentSession.user?.id,
            expiresAt: currentSession.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'unknown'
          });
          
          // Kontrollera om sessionen har gått ut
          if (currentSession.expires_at && currentSession.expires_at * 1000 < Date.now()) {
            console.log('⏰ AuthContext: Session expired, attempting refresh...');
            
            try {
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (!refreshError && refreshedSession) {
                console.log('✅ AuthContext: Session refreshed successfully');
                setSession(refreshedSession);
                setUser(refreshedSession.user);
                
                if (refreshedSession.user.id && refreshedSession.user.email) {
                  createUserProfileIfNeeded(refreshedSession.user.id, refreshedSession.user.email);
                }
              } else {
                console.error('❌ AuthContext: Could not refresh session:', refreshError);
                setSession(null);
                setUser(null);
              }
            } catch (refreshErr) {
              console.error('❌ AuthContext: Error refreshing session:', refreshErr);
              setSession(null);
              setUser(null);
            }
          } else {
            console.log('✅ AuthContext: Session is valid, setting user state');
            setSession(currentSession);
            setUser(currentSession.user);
            
            // Säkerställ att användarprofilen finns
            if (currentSession.user.id && currentSession.user.email) {
              createUserProfileIfNeeded(currentSession.user.id, currentSession.user.email);
            }
          }
        } else {
          console.log('ℹ️ AuthContext: No active session found');
          setSession(null);
          setUser(null);
        }
      } catch (e) {
        console.error('❌ AuthContext: Error during auth initialization:', e);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    setData();
  }, [createUserProfileIfNeeded]);

  // Separat useEffect för lyssnare för att undvika race conditions
  useEffect(() => {
    // Lyssna på auth-ändringar
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed');
        
        // Återställ failure counter vid lyckad auth
        if (typeof window !== 'undefined' && window.authStorageFallback) {
          window.authStorageFallback.resetFailureCount();
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
          
          console.log('Cookie status:', cookieInfo);
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
      
      // Hantera sessionsfel
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh misslyckades utan session');
        setSession(null);
        setUser(null);
      }
      
      // Hantera när användarsessionen blir ogiltig
      if (event === 'USER_UPDATED' && !session) {
        console.warn('Användare uppdaterad men session saknas');
        setSession(null);
        setUser(null);
      }
    });
    
    // Hantera auth-fel och visa lämpliga meddelanden
    const handleAuthError = useCallback((event: CustomEvent) => {
      if (authErrorShown) return; // Förhindra flera meddelanden
      
      const error = event.detail?.error || event.detail;
      const errorMessage = typeof error === 'string' 
        ? error 
        : error?.message || (error?.error && error.error.message) || '';
      
      console.log('Auth error detected:', { error, errorMessage });
      
      // Kontrollera för sessionsrelaterade fel
      if (
        errorMessage.includes('refresh_token_not_found') || 
        errorMessage.includes('invalid session') || 
        errorMessage.includes('JWT expired') ||
        errorMessage.includes('Invalid refresh token') ||
        errorMessage.includes('session_expired')
      ) {
        console.log('Session-related error detected, cleaning up...');
        
        // Rensa session/user state
        setSession(null);
        setUser(null);
        
        // Rensa auth-relaterad data från localStorage och cookies
        if (typeof window !== 'undefined') {
          try {
            // Rensa localStorage
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key);
              }
            });
            
            // Rensa sessionStorage
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('sb-') || key.includes('supabase')) {
                sessionStorage.removeItem(key);
              }
            });
            
            // Rensa cookies
            document.cookie.split(';').forEach(c => {
              const cookieName = c.split('=')[0].trim();
              if (cookieName.startsWith('sb-')) {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                if (process.env.NODE_ENV === 'production') {
                  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.handbok.org;`;
                }
              }
            });
            
            // Rensa memory storage
            if (window.memoryStorage) {
              Object.keys(window.memoryStorage).forEach(key => {
                if (key.startsWith('sb-') || key.includes('supabase')) {
                  delete window.memoryStorage[key];
                }
              });
            }
          } catch (e) {
            console.warn('Error clearing auth data:', e);
          }
        }
        
        // Visa ett meddelande till användaren och omdirigera efter bekräftelse
        setAuthErrorShown(true);
        
        // Använd setTimeout för att undvika att blockera UI
        setTimeout(() => {
          const confirmRelogin = window.confirm(
            'Din session har gått ut. Klicka OK för att logga in igen.'
          );
          
          if (confirmRelogin) {
            // Navigera till login-sidan
            window.location.href = '/login';
          } else {
            // Om användaren inte vill logga in igen, navigera till startsidan
            window.location.href = '/';
          }
        }, 100);
      } else if (
        errorMessage.toLowerCase().includes('email not confirmed') || 
        errorMessage.toLowerCase().includes('email is not confirmed') ||
        errorMessage.toLowerCase().includes('not confirmed') ||
        errorMessage.includes('email_not_confirmed') ||
        error?.code === '401' || 
        error?.code === '422'
      ) {
        // Specifik hantering för obekräftad email
        console.log('Email confirmation error detected');
        
        setAuthErrorShown(true);
        
        setTimeout(() => {
          const confirmResend = window.confirm(
            'Din e-postadress har inte bekräftats än. Du måste klicka på länken i bekräftelsemailet som skickades när du registrerade dig.\n\nKlicka OK för att gå till inloggningssidan där du kan skicka ett nytt bekräftelsemail om det behövs.'
          );
          
          if (confirmResend) {
            window.location.href = '/login';
          }
        }, 100);
      } else {
        // Hantera andra typer av auth-fel
        console.error('Other auth error:', errorMessage);
        
        // För andra fel, visa ett generiskt meddelande
        setAuthErrorShown(true);
        
        setTimeout(() => {
          const confirmRetry = window.confirm(
            'Ett autentiseringsfel uppstod. Klicka OK för att försöka logga in igen.'
          );
          
          if (confirmRetry) {
            window.location.href = '/login';
          }
        }, 100);
      }
    }, [authErrorShown]);

    // Lyssna på auth error event från Supabase
    if (typeof window !== 'undefined') {
      window.addEventListener('supabase.auth.error', handleAuthError as EventListener);
    }

    return () => {
      // Städa upp auth-lyssnare
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
      
      // Städa upp error-lyssnare
      if (typeof window !== 'undefined') {
        window.removeEventListener('supabase.auth.error', handleAuthError as EventListener);
      }
    };
  }, [router, authErrorShown]);

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
    router.push("/login");
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

  // Lägg till en funktion för att manuellt återställa autentiseringen
  const refreshAuth = async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('🔄 Försöker återställa autentisering...');
      setIsLoading(true);
      
      // 1. Försök hämta session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Fel vid hämtning av session:', error);
        
        // 2. Om det finns cookies, försök igen efter en kort paus
        if (typeof document !== 'undefined' && document.cookie.includes('sb-auth')) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
          
          if (!retryError && retrySession) {
            setSession(retrySession);
            setUser(retrySession.user);
            
            if (retrySession.user.id && retrySession.user.email) {
              await createUserProfileIfNeeded(retrySession.user.id, retrySession.user.email);
            }
            
            return {
              success: true,
              message: 'Autentisering återställd från cookies'
            };
          }
        }
        
        // 3. Rensa session om inget fungerar
        setSession(null);
        setUser(null);
        
        return {
          success: false,
          message: 'Kunde inte återställa session. Logga in igen.'
        };
      }
      
      if (!session) {
        setSession(null);
        setUser(null);
        return {
          success: false,
          message: 'Ingen aktiv session hittades'
        };
      }
      
      // 4. Kontrollera om sessionen har gått ut
      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        console.log('Session har gått ut, försöker förnya...');
        
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          setSession(null);
          setUser(null);
          return {
            success: false,
            message: 'Session har gått ut och kunde inte förnyas'
          };
        }
        
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        
        if (refreshedSession.user.id && refreshedSession.user.email) {
          await createUserProfileIfNeeded(refreshedSession.user.id, refreshedSession.user.email);
        }
        
        return {
          success: true,
          message: 'Session förnyad framgångsrikt'
        };
      }
      
      // 5. Session är giltig, uppdatera state
      setSession(session);
      setUser(session.user);
      
      if (session.user.id && session.user.email) {
        await createUserProfileIfNeeded(session.user.id, session.user.email);
      }
      
      return {
        success: true,
        message: 'Autentisering bekräftad'
      };
      
    } catch (e) {
      console.error('Fel vid återställning av autentisering:', e);
      setSession(null);
      setUser(null);
      
      return {
        success: false,
        message: 'Ett oväntat fel uppstod'
      };
    } finally {
      setIsLoading(false);
    }
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
    refreshAuth
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
