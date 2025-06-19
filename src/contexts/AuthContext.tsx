"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
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

// Vi använder nu ENDAST cookies för sessionshantering via Supabase

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authErrorShown, setAuthErrorShown] = useState(false);
  const router = useRouter();

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

  // Prevent double initialization with ref for immediate check
  const initializationRef = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const initializationInProgress = useRef(false);

  // Initiera session från Supabase
  useEffect(() => {
    // Prevent double initialization with multiple checks
    if (initializationRef.current || initialized || initializationInProgress.current) {
      console.log('🔄 AuthContext: Already initialized, skipping...');
      return;
    }
    
    initializationRef.current = true;
    initializationInProgress.current = true;

    const setData = async () => {
      console.log('🔄 AuthContext: Initializing auth state...');
      setIsLoading(true);
      setInitialized(true);
      
      try {
        // Kontrollera om vi är på klientsidan och har tillgång till storage
        if (typeof window === 'undefined') {
          console.log('🖥️ AuthContext: Running on server, skipping session check');
          setIsLoading(false);
          return;
        }

        console.log('🌐 AuthContext: Running on client, proceeding with auth check');

        // Kontrollera logout-flagga först med safe localStorage access
        let logoutFlag = null;
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            logoutFlag = localStorage.getItem('__logout_flag__');
          }
        } catch (e) {
          // Ignore localStorage errors
        }
        
        if (logoutFlag) {
          const logoutTime = parseInt(logoutFlag);
          const timeSinceLogout = Date.now() - logoutTime;
          
          // Om logout skedde inom senaste 30 sekunderna, respektera det
          if (timeSinceLogout < 30000) {
            console.log('🚪 AuthContext: Recent logout detected, skipping session restoration');
            setSession(null);
            setUser(null);
            setIsLoading(false);
            return;
          } else {
            // Rensa gamla logout-flaggan
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem('__logout_flag__');
              }
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        }

        // Säker kontroll av storage access
        let hasStorageAccess = false;
        try {
          hasStorageAccess = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem;
        } catch (e) {
          hasStorageAccess = false;
        }
        if (!hasStorageAccess) {
          console.warn('⚠️ AuthContext: No storage access, using fallback auth');
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
          
          // Om det är en auth error, rensa korrupt session data
          if (error.message?.includes('Invalid') || error.message?.includes('expired') || error.message?.includes('jwt')) {
            console.log('🧹 AuthContext: Clearing corrupted session data...');
            try {
              await supabase.auth.signOut();
              if (typeof window !== 'undefined') {
                try {
                  if (window.localStorage) {
                    localStorage.removeItem('supabase.auth.token');
                  }
                } catch (e) {
                  // Ignore localStorage errors
                }
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            sessionStorage.removeItem('supabase.auth.token');
          } catch (e) {
            console.warn('Could not remove sessionStorage item:', e);
          }
        }
                // Rensa alla supabase-relaterade cookies
                document.cookie.split(";").forEach((c) => {
                  const eqPos = c.indexOf("=");
                  const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                  if (name.startsWith('sb-')) {
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                  }
                });
              }
            } catch (cleanupError) {
              console.warn('Warning during cleanup:', cleanupError);
            }
          }
          
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        if (currentSession) {
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
        }
      } catch (e) {
        console.error('❌ AuthContext: Error during auth initialization:', e);
        setSession(null);
        setUser(null);
      } finally {
        console.log('🏁 AuthContext: Setting isLoading to false');
        setIsLoading(false);
        initializationInProgress.current = false;
      }
    };
    
    setData();
  }, []); // Removed dependency to prevent re-runs

  // Separat useEffect för lyssnare för att undvika race conditions
  useEffect(() => {
    // Prevent setting up multiple listeners
    if (initializationInProgress.current) {
      return;
    }

    // Lyssna på auth-ändringar
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip if we're still initializing to prevent race conditions
      if (initializationInProgress.current) {
        return;
      }

      // Reduce auth logging frequency to prevent render loops
      if (Math.random() < 0.2) { // Only log 20% of auth changes
        console.log('Auth state change:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
        });
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed');
        
        // Återställ failure counter vid lyckad auth
        if (typeof window !== 'undefined' && window.authStorageFallback) {
          window.authStorageFallback.resetFailureCount();
        }
        
        // Uppdatera state only if different
        setSession(prevSession => {
          if (prevSession?.user?.id !== session?.user?.id) {
            return session;
          }
          return prevSession;
        });
        setUser(prevUser => {
          if (prevUser?.id !== session?.user?.id) {
            return session?.user ?? null;
          }
          return prevUser;
        });
        
        // Validera sessionscookie (less frequent logging)
        if (typeof document !== 'undefined' && Math.random() < 0.1) { // Only 10% of the time
          const cookieInfo = {
            hasCookies: document.cookie.includes('sb-auth'),
            cookies: document.cookie.split(';').map(c => c.trim()).filter(c => c.startsWith('sb-')).join(', ')
          };
          
          console.log('Cookie status:', cookieInfo);
        }
        
        // Säkerställ att användarprofilen finns (debounced)
        if (session?.user?.id && session?.user?.email) {
          createUserProfileIfNeeded(session.user.id, session.user.email).catch(err => {
            console.warn('Profile creation warning:', err);
          });
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
  }, []);

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

      // 2. Logga ut från Supabase
      await supabase.auth.signOut();
      
      // 3. Aggressiv rensning av all auth-data
      if (typeof window !== 'undefined') {
        try {
          // Rensa localStorage säkert
          if (safeLocalStorage.isAvailable()) {
            try {
              const keysToRemove = [];
              // Safely iterate through localStorage keys
                      try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
                              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // Ignore localStorage access errors
        }
              keysToRemove.forEach(key => {
                const success = safeLocalStorage.removeItem(key);
                if (success) {
                  console.log(`🗑️ Removed localStorage key: ${key}`);
                } else {
                  console.warn(`⚠️ Could not remove localStorage key: ${key}`);
                }
              });
            } catch (localStorageError) {
              console.warn('⚠️ Could not access localStorage for cleanup:', localStorageError);
            }
          }
          
          // Rensa sessionStorage också
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
              try {
                sessionStorage.removeItem(key);
                console.log(`🗑️ Removed sessionStorage key: ${key}`);
              } catch (e) {
                console.warn(`⚠️ Could not remove sessionStorage key: ${key}`, e);
              }
            }
          }
          
          // Rensa cookies aggressivt med error handling
          try {
            document.cookie.split(";").forEach(cookie => {
              try {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                if (name && (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth'))) {
                  // Rensa för aktuell domän och path
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                  
                  // För handbok.org domäner
                  if (window.location.hostname.includes('handbok.org')) {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.handbok.org`;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=handbok.org`;
                  }
                  
                  // För localhost development
                  if (window.location.hostname === 'localhost') {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
                  }
                  
                  console.log(`🍪 Cleared cookie: ${name}`);
                }
              } catch (cookieError) {
                console.warn(`⚠️ Could not clear individual cookie:`, cookieError);
              }
            });
          } catch (cookiesError) {
            console.warn(`⚠️ Could not access cookies:`, cookiesError);
          }
          
        } catch (e) {
          console.warn('⚠️ Error during aggressive auth data cleanup:', e);
        }
      }
      
      console.log('✅ AuthContext: Logout completed successfully');
      
      // 4. Sätt en flagga för att förhindra session-restoration
      if (typeof window !== 'undefined') {
        safeLocalStorage.setItem('__logout_flag__', Date.now().toString());
      }
      
    } catch (error) {
      console.error('❌ AuthContext: Error during logout:', error);
    } finally {
      setIsLoading(false);
    }
    
    // 5. Omdirigera till login efter en kort paus
    setTimeout(() => {
      console.log('🚀 AuthContext: Redirecting to login page');
      router.push("/login?logged_out=true");
    }, 500);
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
