import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Diagnostiken är nu aktiverad med förbättrad säkerhet
const DIAGNOSTICS_ENABLED = true;

// Säker localStorage-åtkomst som aldrig genererar fel i konsolen
const safeLocalStorageAccess = (() => {
  let isAccessible = false;
  let hasBeenTested = false;
  
  const testAccess = () => {
    if (hasBeenTested) return isAccessible;
    hasBeenTested = true;
    
    try {
      if (typeof window === 'undefined') return false;
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      isAccessible = true;
    } catch {
      isAccessible = false;
    }
    return isAccessible;
  };
  
  return {
    get isAccessible() {
      return testAccess();
    },
    
    getItem: (key: string): string | null => {
      if (!testAccess()) return null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    
    setItem: (key: string, value: string): boolean => {
      if (!testAccess()) return false;
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    
    removeItem: (key: string): boolean => {
      if (!testAccess()) return false;
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    
    getKeys: (): string[] => {
      if (!testAccess()) return [];
      try {
        return Object.keys(window.localStorage);
      } catch {
        return [];
      }
    }
  };
})();

// Enkel typ för att behålla API-kompatibilitet
type DiagnosticEvent = {
  timestamp: number;
  type: 'cookie' | 'session' | 'network' | 'auth' | 'error';
  message: string;
  data?: any;
};

// Tom array för kompatibilitet
let diagnosticEvents: DiagnosticEvent[] = [];

/**
 * Inaktiverad diagnostikloggning
 */
export function logDiagnostic(
  type: DiagnosticEvent['type'], 
  message: string, 
  data?: any
) {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Inaktiverad cookie-snapshot
 */
export function snapshotCookies() {
  // Inaktiverad - gör ingenting
  return {};
}

/**
 * Inaktiverad session-snapshot
 */
export function snapshotSession(session: Partial<Session> | null) {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Inaktiverad storage-access logging
 */
export function logStorageAccess() {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Inaktiverad diagnostik-polling
 */
export function startDiagnosticPolling() {
  // Inaktiverad - returnerar tom cleanup-funktion
  return () => {};
}

/**
 * Returnerar tom array
 */
export function getDiagnosticEvents() {
  return [];
}

/**
 * Gör ingenting
 */
export function clearDiagnosticEvents() {
  // Inaktiverad - gör ingenting
  return;
}

/**
 * Returnerar tom diagnostikdata
 */
export function exportDiagnosticData() {
  return JSON.stringify({
    message: 'Diagnostik har inaktiverats för prestandaskäl',
    timestamp: new Date().toISOString()
  }, null, 2);
}

// Backward compatibility aliases
export const getDiagnosticLogs = getDiagnosticEvents;
export const clearDiagnosticLogs = clearDiagnosticEvents;

export interface AuthDiagnostics {
  timestamp: string;
  environment: string;
  hostname: string;
  cookies: {
    hasAuthCookies: boolean;
    cookieCount: number;
    cookieNames: string[];
  };
  localStorage: {
    accessible: boolean;
    hasAuthData: boolean;
    keys: string[];
  };
  supabaseSession: {
    hasSession: boolean;
    hasUser: boolean;
    userId?: string;
    email?: string;
    expiresAt?: string;
    error?: string;
  };
  authContext: {
    isLoading: boolean;
    hasUser: boolean;
    hasSession: boolean;
  };
}

export async function runAuthDiagnostics(): Promise<AuthDiagnostics> {
  const diagnostics: AuthDiagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    cookies: {
      hasAuthCookies: false,
      cookieCount: 0,
      cookieNames: []
    },
    localStorage: {
      accessible: false,
      hasAuthData: false,
      keys: []
    },
    supabaseSession: {
      hasSession: false,
      hasUser: false
    },
    authContext: {
      isLoading: false,
      hasUser: false,
      hasSession: false
    }
  };

  // Kontrollera cookies
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const authCookies = cookies.filter(c => c.startsWith('sb-'));
    
    diagnostics.cookies = {
      hasAuthCookies: authCookies.length > 0,
      cookieCount: authCookies.length,
      cookieNames: authCookies.map(c => c.split('=')[0])
    };
  }

  // Kontrollera localStorage
  if (typeof window !== 'undefined') {
    diagnostics.localStorage = {
      accessible: safeLocalStorageAccess.isAccessible,
      hasAuthData: false,
      keys: []
    };

    if (safeLocalStorageAccess.isAccessible) {
      const keys = safeLocalStorageAccess.getKeys();
      const authKeys = keys.filter(k => 
        k.includes('supabase') || 
        k.includes('auth') || 
        k.startsWith('sb-')
      );

      diagnostics.localStorage = {
        accessible: true,
        hasAuthData: authKeys.length > 0,
        keys: authKeys
      };
    }
  }

  // Kontrollera Supabase session
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      diagnostics.supabaseSession = {
        hasSession: false,
        hasUser: false,
        error: error.message
      };
    } else if (session) {
      diagnostics.supabaseSession = {
        hasSession: true,
        hasUser: !!session.user,
        userId: session.user?.id,
        email: session.user?.email,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined
      };
    } else {
      diagnostics.supabaseSession = {
        hasSession: false,
        hasUser: false
      };
    }
  } catch (e) {
    diagnostics.supabaseSession = {
      hasSession: false,
      hasUser: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }

  return diagnostics;
}

export function logAuthDiagnostics(diagnostics: AuthDiagnostics) {
  console.group('🔍 Auth Diagnostics');
  console.log('Timestamp:', diagnostics.timestamp);
  console.log('Environment:', diagnostics.environment);
  console.log('Hostname:', diagnostics.hostname);
  
  console.group('🍪 Cookies');
  console.log('Has auth cookies:', diagnostics.cookies.hasAuthCookies);
  console.log('Cookie count:', diagnostics.cookies.cookieCount);
  console.log('Cookie names:', diagnostics.cookies.cookieNames);
  console.groupEnd();
  
  console.group('💾 LocalStorage');
  console.log('Accessible:', diagnostics.localStorage.accessible);
  console.log('Has auth data:', diagnostics.localStorage.hasAuthData);
  console.log('Auth keys:', diagnostics.localStorage.keys);
  console.groupEnd();
  
  console.group('🔐 Supabase Session');
  console.log('Has session:', diagnostics.supabaseSession.hasSession);
  console.log('Has user:', diagnostics.supabaseSession.hasUser);
  if (diagnostics.supabaseSession.userId) {
    console.log('User ID:', diagnostics.supabaseSession.userId);
  }
  if (diagnostics.supabaseSession.email) {
    console.log('Email:', diagnostics.supabaseSession.email);
  }
  if (diagnostics.supabaseSession.expiresAt) {
    console.log('Expires at:', diagnostics.supabaseSession.expiresAt);
  }
  if (diagnostics.supabaseSession.error) {
    console.error('Session error:', diagnostics.supabaseSession.error);
  }
  console.groupEnd();
  
  console.groupEnd();
}

export async function fixAuthIssues(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔧 Försöker fixa autentiseringsproblem...');
    
    // 1. Försök hämta session igen
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Fel vid hämtning av session:', error);
      
      // 2. Försök logga ut och in igen
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'Session kunde inte hämtas. Du har loggats ut. Försök logga in igen.'
      };
    }
    
    if (!session) {
      return {
        success: false,
        message: 'Ingen aktiv session hittades. Logga in igen.'
      };
    }
    
    // 3. Kontrollera om sessionen har gått ut
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      console.log('Session har gått ut, försöker förnya...');
      
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !newSession) {
        await supabase.auth.signOut();
        return {
          success: false,
          message: 'Session har gått ut och kunde inte förnyas. Logga in igen.'
        };
      }
      
      return {
        success: true,
        message: 'Session förnyad framgångsrikt!'
      };
    }
    
    return {
      success: true,
      message: 'Autentisering verkar fungera korrekt.'
    };
    
  } catch (e) {
    console.error('Fel vid försök att fixa autentisering:', e);
    return {
      success: false,
      message: 'Ett oväntat fel uppstod vid försök att fixa autentiseringen.'
    };
  }
} 