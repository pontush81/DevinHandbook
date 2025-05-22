import { Session } from '@supabase/supabase-js';

// Skapa en unik ID för denna sessionsinstans
const SESSION_INSTANCE_ID = Math.random().toString(36).substring(2, 15);

// Diagnostikinställningar
const DIAGNOSTICS_ENABLED = process.env.NODE_ENV !== 'production' || true;
const DEBUG_COOKIES = true;
const DEBUG_SESSION = true;
const DEBUG_NETWORK = true;
const HISTORY_LENGTH = 100;

// Historia av händelser för att spåra problem
type DiagnosticEvent = {
  timestamp: number;
  type: 'cookie' | 'session' | 'network' | 'auth' | 'error';
  message: string;
  data?: any;
};

// Globalt håll i diagnostikdata
let diagnosticEvents: DiagnosticEvent[] = [];
let isPolling = false;
let lastCookieSnapshot: Record<string, string> = {};
let lastSessionSnapshot: Partial<Session> | null = null;

/**
 * Lägger till en diagnostikhändelse till historiken
 */
export function logDiagnostic(
  type: DiagnosticEvent['type'], 
  message: string, 
  data?: any
) {
  if (!DIAGNOSTICS_ENABLED) return;

  const event: DiagnosticEvent = {
    timestamp: Date.now(),
    type,
    message,
    data
  };

  diagnosticEvents.push(event);
  
  // Behåll bara senaste X händelser
  if (diagnosticEvents.length > HISTORY_LENGTH) {
    diagnosticEvents = diagnosticEvents.slice(-HISTORY_LENGTH);
  }

  // Logga till konsolen för direkt feedback
  console.log(`[Auth Diagnostics] [${type.toUpperCase()}] ${message}`, data || '');
}

/**
 * Hämtar alla cookies och analyserar dem
 */
export function snapshotCookies() {
  if (!DEBUG_COOKIES || typeof document === 'undefined') return;

  const cookies: Record<string, string> = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name) cookies[name] = value || '';
  });

  // Hitta bara auth-relaterade cookies
  const authCookies = Object.keys(cookies)
    .filter(name => name.startsWith('sb-') || name.includes('auth'))
    .reduce((obj, key) => {
      obj[key] = cookies[key];
      return obj;
    }, {} as Record<string, string>);

  // Kontrollera om cookies har ändrats sedan sist
  const changes: Record<string, { old?: string, new?: string }> = {};
  let hasChanges = false;

  // Kontrollera borttagna/ändrade cookies
  Object.keys(lastCookieSnapshot).forEach(name => {
    if (!authCookies[name]) {
      changes[name] = { old: lastCookieSnapshot[name] };
      hasChanges = true;
    } else if (authCookies[name] !== lastCookieSnapshot[name]) {
      changes[name] = { old: lastCookieSnapshot[name], new: authCookies[name] };
      hasChanges = true;
    }
  });

  // Kontrollera nya cookies
  Object.keys(authCookies).forEach(name => {
    if (!lastCookieSnapshot[name]) {
      changes[name] = { new: authCookies[name] };
      hasChanges = true;
    }
  });

  // Logga om det finns förändringar
  if (hasChanges) {
    logDiagnostic('cookie', 'Cookie-förändringar detekterade', { 
      changes,
      currentCookies: authCookies
    });
  }

  // Uppdatera snapshot
  lastCookieSnapshot = { ...authCookies };
  
  return authCookies;
}

/**
 * Jämför två sessioner och identifierar skillnader
 */
export function compareSessionSnapshots(
  oldSession: Partial<Session> | null, 
  newSession: Partial<Session> | null
) {
  if (!oldSession && !newSession) return { hasChanges: false, changes: {} };
  if (!oldSession) return { hasChanges: true, changes: { fullSession: 'created' } };
  if (!newSession) return { hasChanges: true, changes: { fullSession: 'removed' } };

  const changes: Record<string, { old?: any, new?: any }> = {};
  let hasChanges = false;

  // Jämför viktiga sessionsfält
  const fieldsToCompare = [
    'access_token', 
    'refresh_token',
    'expires_at',
    'expires_in'
  ];

  fieldsToCompare.forEach(field => {
    const oldValue = (oldSession as any)[field];
    const newValue = (newSession as any)[field];
    
    if (oldValue !== newValue) {
      // För tokens, visa bara om de finns eller inte istället för hela värdet
      if (field.includes('token')) {
        changes[field] = { 
          old: oldValue ? 'present' : 'missing',
          new: newValue ? 'present' : 'missing'
        };
      } else {
        changes[field] = { old: oldValue, new: newValue };
      }
      hasChanges = true;
    }
  });

  // Kontrollera user-objektet om det finns
  if (oldSession.user?.id !== newSession.user?.id) {
    changes['user.id'] = { 
      old: oldSession.user?.id, 
      new: newSession.user?.id 
    };
    hasChanges = true;
  }

  return { hasChanges, changes };
}

/**
 * Tar en snapshot av nuvarande session och jämför med senaste
 */
export function snapshotSession(session: Partial<Session> | null) {
  if (!DEBUG_SESSION) return;

  // Skapa en rensad kopia av sessionen för loggning (utan känsliga token-värden)
  const sanitizedSession = session ? {
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    has_access_token: !!session.access_token,
    has_refresh_token: !!session.refresh_token,
    user_id: session.user?.id
  } : null;

  // Jämför med föregående session
  const { hasChanges, changes } = compareSessionSnapshots(lastSessionSnapshot, session);

  if (hasChanges) {
    logDiagnostic('session', 'Session-förändringar detekterade', {
      changes,
      currentSession: sanitizedSession
    });
  }

  // Uppdatera snapshot
  lastSessionSnapshot = session ? { ...session } : null;
}

/**
 * Starta kontinuerlig polling av diagnostikdata
 */
export function startDiagnosticPolling() {
  if (isPolling || !DIAGNOSTICS_ENABLED || typeof window === 'undefined') return;
  
  isPolling = true;
  
  // Skapa en identifierare för debugging-instansen
  logDiagnostic('auth', `Diagnostik startad (instans: ${SESSION_INSTANCE_ID})`);
  
  // Regelbundet kontrollera cookies
  const cookieInterval = setInterval(() => {
    snapshotCookies();
  }, 2000);

  // Regelbundet kontrollera localStorage/sessionStorage
  const storageInterval = setInterval(() => {
    if (typeof window === 'undefined') return;

    try {
      // Kontrollera localStorage för auth-relaterade poster
      const authKeys = Object.keys(localStorage)
        .filter(key => key.includes('supabase') || key.includes('auth') || key.includes('sb-'));
      
      if (authKeys.length > 0) {
        const authItems: Record<string, string> = {};
        authKeys.forEach(key => {
          authItems[key] = localStorage.getItem(key) || '';
        });
        
        logDiagnostic('auth', 'Auth-relaterade localStorage-poster hittade', authItems);
      }
    } catch (err) {
      // Ignorera localStorage-fel (kan vara blockerad av privacy-inställningar)
    }
  }, 5000);

  // Spåra nätverksbegäran till Supabase om debuggning är aktiverad
  if (DEBUG_NETWORK && typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Fånga bara Supabase auth-relaterade anrop
      if (url.includes('supabase') && url.includes('/auth/')) {
        logDiagnostic('network', `Fetch-anrop: ${url}`, {
          method: init?.method || 'GET',
          headers: init?.headers,
          hasBody: !!init?.body
        });
        
        try {
          const response = await originalFetch.apply(this, [input, init]);
          
          // Klona svar för att kunna logga det
          const clone = response.clone();
          
          try {
            // Försök tolka som JSON
            const data = await clone.json();
            logDiagnostic('network', `Fetch-svar: ${url}`, {
              status: response.status,
              statusText: response.statusText,
              hasSession: !!data.session,
              error: data.error
            });
          } catch (e) {
            // Om det inte är JSON, logga bara statuskod
            logDiagnostic('network', `Fetch-svar: ${url}`, {
              status: response.status,
              statusText: response.statusText,
              isJson: false
            });
          }
          
          return response;
        } catch (error) {
          logDiagnostic('error', `Fetch-fel: ${url}`, {
            error: error.message
          });
          throw error;
        }
      }
      
      return originalFetch.apply(this, [input, init]);
    };
  }

  // Rensa vid avmontning/navigering
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(cookieInterval);
      clearInterval(storageInterval);
      logDiagnostic('auth', 'Diagnostik avslutad: Sidnavigering');
      isPolling = false;
    });
  }

  return () => {
    clearInterval(cookieInterval);
    clearInterval(storageInterval);
    isPolling = false;
  };
}

/**
 * Hämtar all diagnostikdata för visning
 */
export function getDiagnosticEvents() {
  return [...diagnosticEvents];
}

/**
 * Rensar diagnostikdata
 */
export function clearDiagnosticEvents() {
  diagnosticEvents = [];
  logDiagnostic('auth', 'Diagnostikdata rensad');
}

/**
 * Exportera diagnostikdata som JSON
 */
export function exportDiagnosticData() {
  const data = {
    instanceId: SESSION_INSTANCE_ID,
    timestamp: new Date().toISOString(),
    events: diagnosticEvents,
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : 'unknown',
      host: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown'
    },
    cookies: lastCookieSnapshot,
    session: lastSessionSnapshot ? {
      expires_at: lastSessionSnapshot.expires_at,
      expires_in: lastSessionSnapshot.expires_in,
      has_access_token: !!lastSessionSnapshot.access_token,
      has_refresh_token: !!lastSessionSnapshot.refresh_token,
      user_id: lastSessionSnapshot.user?.id
    } : null
  };
  
  return JSON.stringify(data, null, 2);
} 