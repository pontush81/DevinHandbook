"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ensureUserProfile } from "@/lib/user-utils";
import { showToast } from '@/components/ui/use-toast';
import { safeLocalStorage } from '@/lib/safe-storage';

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

// Global flag to prevent multiple initializations during Fast Refresh
let globalAuthInitialized = false;

// Vi använder nu ENDAST cookies för sessionshantering via Supabase

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authErrorShown, setAuthErrorShown] = useState(false);
  const router = useRouter();
  
  // Get Supabase client instance
  const supabase = getSupabaseClient();

  // Keep track of profile creation attempts to prevent duplicates
  const profileCreationRef = useRef<Set<string>>(new Set());

  // Funktion för att skapa användarprofil om den inte finns
  const createUserProfileIfNeeded = useCallback(async (userId: string, email: string) => {
    if (!userId || !email) return;
    
    // Prevent duplicate profile creation attempts
    const key = `${userId}-${email}`;
    if (profileCreationRef.current.has(key)) {
      console.log('Profile creation already in progress for user:', userId);
      return;
    }
    
    profileCreationRef.current.add(key);
    
    try {
      await ensureUserProfile(supabase, userId, email);
    } catch (error) {
      console.error('Fel vid profilskapande:', error);
    } finally {
      // Remove from set after completion (successful or failed)
      profileCreationRef.current.delete(key);
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

  // Hantera auth-fel med mjuk sessionshantering
  const handleAuthError = (event: CustomEvent) => {
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
      console.log('🔄 Session-related error detected, letting SessionReconnectHandler handle it...');
      
      // Rensa session/user state tyst
      setSession(null);
      setUser(null);
      
      // Rensa auth-data från storage tyst
      if (typeof window !== 'undefined') {
        try {
          // Rensa localStorage säkert
          if (safeLocalStorage.isAvailable()) {
            try {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.includes('supabase')) {
                  safeLocalStorage.removeItem(key);
                }
              });
            } catch (e) {
              console.warn('Could not clear localStorage:', e);
            }
          }
          
          // Rensa cookies med error handling
          try {
            document.cookie.split(";").forEach(cookie => {
              try {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                if (name && (name.startsWith('sb-') || name.includes('supabase'))) {
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.handbok.org`;
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                }
              } catch (cookieError) {
                console.warn(`⚠️ Could not clear individual cookie:`, cookieError);
              }
            });
          } catch (cookiesError) {
            console.warn(`⚠️ Could not access cookies:`, cookiesError);
          }
        } catch (e) {
          console.warn('Error clearing auth data:', e);
        }
      }
      
      // Sätt flagga så vi inte visar flera meddelanden
      setAuthErrorShown(true);
      
      // Låt SessionReconnectHandler hantera resten - ingen aggressiv popup eller redirect
      return;
      
    } else if (
      errorMessage.toLowerCase().includes('email not confirmed') || 
      errorMessage.toLowerCase().includes('email is not confirmed') ||
      errorMessage.toLowerCase().includes('not confirmed') ||
      errorMessage.includes('email_not_confirmed') ||
      error?.code === '401' || 
      error?.code === '422'
    ) {
      // Specifik hantering för obekräftad email - detta är ett permanent problem som kräver action
      console.log('Email confirmation error detected');
      
      setAuthErrorShown(true);
      
      showToast({
        title: "E-post inte bekräftad",
        description: "Du omdirigeras till inloggningssidan där du kan skicka ett nytt bekräftelsemail.",
        variant: "destructive",
      });
      
      // Automatisk omdirigering efter kort fördröjning
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } else {
      // Hantera andra typer av auth-fel med mindre aggressivt meddelande
      console.error('Other auth error:', errorMessage);
      
      setAuthErrorShown(true);
      
      // Visa endast ett diskret meddelande, ingen omedelbar redirect
      showToast({
        title: "Anslutningsproblem",
        description: "Sessionen kunde inte upprätthållas. Försöker återansluta...",
        variant: "default", // Använd inte "destructive" för tillfälliga problem
      });
      
      // Ingen automatisk omdirigering - låt SessionReconnectHandler hantera det
    }
  };

  // Initiera session från Supabase
  useEffect(() => {
    // Use global flag to prevent multiple initializations during Fast Refresh
    if (globalAuthInitialized) {
      console.log('🔄 AuthContext: Already initialized globally, skipping...');
      return;
    }
    
    globalAuthInitialized = true;
    console.log('✅ AuthContext: First global initialization, proceeding...');

    const setData = async () => {
      console.log('🔄 AuthContext: Initializing auth state...');
      setIsLoading(true);
      
      try {
        // Kontrollera om vi är på klientsidan
        if (typeof window === 'undefined') {
          console.log('🖥️ AuthContext: Running on server, skipping session check');
          setIsLoading(false);
          return;
        }

        console.log('🌐 AuthContext: Running on client, proceeding with auth check');
        

        


        // Hämta aktuell session
        console.log('📡 AuthContext: Getting current session from Supabase...');
        
        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          
          console.log('📡 AuthContext: getSession() completed successfully');
          
          if (error) {
            console.error('❌ AuthContext: Error getting session:', error);
            
            // Om det är en auth error, rensa korrupt session data
            if (error.message?.includes('Invalid') || error.message?.includes('expired') || error.message?.includes('jwt')) {
              console.log('🧹 AuthContext: Clearing corrupted session data...');
              try {
                await supabase.auth.signOut();
              } catch (cleanupError) {
                console.warn('Warning during cleanup:', cleanupError);
              }
            }
            
            setSession(null);
            setUser(null);
            console.log('❌ AuthContext: Set user and session to null due to error');
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
                    createUserProfileIfNeeded(refreshedSession.user.id, refreshedSession.user.email).catch(err => {
                      console.warn('Profile creation warning:', err);
                    });
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
              console.log('✅ AuthContext: User and session state updated');
              
              // Säkerställ att användarprofilen finns
              if (currentSession.user.id && currentSession.user.email) {
                createUserProfileIfNeeded(currentSession.user.id, currentSession.user.email).catch(err => {
                  console.warn('Profile creation warning:', err);
                });
              }
            }
          } else {
            console.log('ℹ️ AuthContext: No active session found');
            setSession(null);
            setUser(null);
            console.log('ℹ️ AuthContext: Set user and session to null (no session)');
          }
        } catch (sessionError) {
          console.error('❌ AuthContext: Exception during getSession:', sessionError);
          setSession(null);
          setUser(null);
        }
      } catch (e) {
        console.error('❌ AuthContext: Error during auth initialization:', e);
        setSession(null);
        setUser(null);
      } finally {
        console.log('🏁 AuthContext: Setting isLoading to false');
        setIsLoading(false);
        console.log('🏁 AuthContext: Auth initialization completed');
      }
    };
    
    console.log('🔄 AuthContext: Calling setData function...');
    setData().catch(error => {
      console.error('❌ AuthContext: setData promise rejected:', error);
      setIsLoading(false);
    });
  }, []); // Removed dependency to prevent re-runs

  // Separat useEffect för lyssnare för att undvika race conditions
  useEffect(() => {
    // Lyssna på auth-ändringar
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        console.log('✅ User signed in, token refreshed, or initial session found');
        
        // Återställ failure counter vid lyckad auth
        if (typeof window !== 'undefined' && window.authStorageFallback) {
          window.authStorageFallback.resetFailureCount();
        }
        
        // Uppdatera state direkt
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false); // Viktigt: Sätt isLoading till false när användaren är inloggad
        console.log('🏁 AuthContext: Set isLoading to false after', event);
        console.log('🏁 AuthContext: Current state after update:', { 
          hasSession: !!session, 
          hasUser: !!(session?.user), 
          isLoading: false 
        });
        
        // Säkerställ att användarprofilen finns
        if (session?.user?.id && session?.user?.email) {
          createUserProfileIfNeeded(session.user.id, session.user.email).catch(err => {
            console.warn('Profile creation warning:', err);
          });
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out');
        setSession(null);
        setUser(null);
        setIsLoading(false); // Viktigt: Sätt isLoading till false även när utloggad
        // Reset global flag so auth can reinitialize if needed
        globalAuthInitialized = false;
      }
      
      // Hantera sessionsfel
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('❌ Token refresh misslyckades utan session');
        setSession(null);
        setUser(null);
        setIsLoading(false); // Viktigt: Sätt isLoading till false även vid fel
      }
      
      // Hantera när användarsessionen blir ogiltig
      if (event === 'USER_UPDATED' && !session) {
        console.warn('❌ Användare uppdaterad men session saknas');
        setSession(null);
        setUser(null);
        setIsLoading(false); // Viktigt: Sätt isLoading till false även vid fel
      }
    });

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
  }, [createUserProfileIfNeeded]);

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
    console.log('🚪 AuthContext: Starting logout process...');
    
    try {
      // 1. Rensa state först
      setSession(null);
      setUser(null);
      setIsLoading(true);

      // 2. Logga ut från Supabase (låter Supabase hantera cookie-rensning)
      await supabase.auth.signOut();
      
      console.log('✅ AuthContext: Logout completed successfully');
      
    } catch (error) {
      console.error('❌ AuthContext: Error during logout:', error);
    } finally {
      setIsLoading(false);
    }
    
    // 3. Omdirigera till login direkt
    router.push("/login?logged_out=true");
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
  
  // Debug logging för att se vad useAuth returnerar
  console.log('🎯 useAuth returning:', {
    hasUser: !!context.user,
    isLoading: context.isLoading,
    hasSession: !!context.session
  });
  
  return context;
};
