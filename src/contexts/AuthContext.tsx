"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ensureUserProfile } from "@/lib/user-utils";
import { logDiagnostic, snapshotSession, snapshotCookies, logStorageAccess } from "@/lib/auth-diagnostics";

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

  // Initiera session från Supabase
  useEffect(() => {
    const setData = async () => {
      setIsLoading(true);
      
      try {
        // Logga storage-status vid start
        logStorageAccess();
        
        // Hämta aktuell session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Fel vid hämtning av session:', error);
          logDiagnostic('error', 'Fel vid hämtning av initial session', { error: error });
          setSession(null);
          setUser(null);
        } else if (currentSession) {
          logDiagnostic('session', 'Hittade aktiv session', {
            userId: currentSession.user?.id,
            expiresAt: currentSession.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'unknown'
          });
          console.log('Hittade aktiv session från Supabase', {
            userId: currentSession.user?.id,
            expiresAt: currentSession.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'unknown'
          });
          
          // Ta snapshot av sessionen för diagnostik
          snapshotSession(currentSession);
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Säkerställ att användarprofilen finns
          if (currentSession.user.id && currentSession.user.email) {
            createUserProfileIfNeeded(currentSession.user.id, currentSession.user.email);
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
    
    setData();
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
        
        // Logga storage-status efter inloggning eller token refresh
        logStorageAccess();
        
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
    const handleAuthError = (event: CustomEvent) => {
      // Undvik att visa flera auth-felmeddelanden
      if (authErrorShown) return;

      const errorMessage = event.detail?.message || 'Ett autentiseringsfel inträffade';
      
      // Kontrollera specifikt för refresh token fel
      const isRefreshTokenError = errorMessage.includes('refresh_token_not_found') || 
                                 errorMessage.includes('Invalid Refresh Token');
      
      if (isRefreshTokenError) {
        logDiagnostic('error', 'Refresh token fel upptäckt', { errorMessage });
        
        // Rensa session state
        setSession(null);
        setUser(null);
        
        // Visa ett meddelande till användaren och omdirigera efter bekräftelse
        setAuthErrorShown(true);
        const confirmRelogin = window.confirm(
          'Din session har gått ut. Klicka OK för att logga in igen.'
        );
        
        if (confirmRelogin) {
          // Rensa eventuella tokens innan vi navigerar till login
          try {
            supabase.auth.signOut();
          } catch (e) {
            // Ignorera eventuella fel vid utloggning
          }
          
          // Navigera till login-sidan
          router.push('/login');
        }
      } else {
        // Hantera andra typer av auth-fel
        console.error('Auth error:', errorMessage);
        logDiagnostic('error', 'Auth error', { errorMessage });
      }
    };

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
