import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { safeLocalStorage } from '@/lib/safe-storage';

// Ensure SUPABASE_URL has https:// prefix
const ensureHttpsPrefix = (url: string) => {
  if (!url) return '';
  return url.startsWith('http://') || url.startsWith('https://')
    ? url.replace('http://', 'https://') // Alltid tvinga https:// även om http:// anges
    : `https://${url}`;
};

// Kontrollera miljövariabler och logga för felsökning
const supabaseUrl = ensureHttpsPrefix(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Logga miljövariabler för felsökning (bara vid felsökning, ta bort i produktion)
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SUPABASE === 'true') {
  // console.log('Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing', supabaseUrl ? `(${supabaseUrl.substring(0, 12)}...)` : '');
      // console.log('Supabase Anon Key:', supabaseAnonKey ? '✓ Set' : '✗ Missing', supabaseAnonKey ? '(längd: ' + supabaseAnonKey.length + ')' : '');
  // Only log Service Role Key on the server side
  if (typeof window === 'undefined') {
          // console.log('Supabase Service Role Key:', supabaseServiceRoleKey ? '✓ Set' : '✗ Missing', supabaseServiceRoleKey ? '(längd: ' + supabaseServiceRoleKey.length + ')' : '');
  }
  console.log('Node Environment:', process.env.NODE_ENV);
  console.log('Is Edge Runtime:', typeof EdgeRuntime !== 'undefined');
  console.log('Vercel Deployment:', process.env.VERCEL_URL || 'inte i Vercel');
  
  // Lägg till produktionsspecifik diagnostik
  if (typeof window !== 'undefined') {
    // console.log('Current hostname:', window.location.hostname);
    // console.log('NEXT_PUBLIC_HANDBOOK_DOMAIN:', process.env.NEXT_PUBLIC_HANDBOOK_DOMAIN || 'not set');
    
    // Fix cookie domain for development
    let cookieDomain: string | undefined;
    if (process.env.NODE_ENV === 'production') {
      cookieDomain = process.env.NEXT_PUBLIC_HANDBOOK_DOMAIN ? 
        `.${process.env.NEXT_PUBLIC_HANDBOOK_DOMAIN}` :
        (window.location.hostname.includes('handbok.org') ? '.handbok.org' : undefined);
    } else {
      // For development, use localhost without domain restrictions
      cookieDomain = window.location.hostname === 'localhost' ? undefined : window.location.hostname;
    }
    
    // console.log('Cookie domain will be:', cookieDomain || 'localhost (no domain restriction)');
  }
}

if (typeof window !== 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase miljövariabler saknas! Applikationen kommer inte att fungera korrekt.');
  }
  
  // SECURITY WARNING: Admin operations should NEVER be called from client-side
  if ('admin' in (globalThis as any) || (globalThis as any).supabaseAdmin) {
    console.warn('⚠️ SECURITY: Admin Supabase client detected on client-side. This is a security risk!');
  }
}

// Server-side check (för att undvika fel i browsers)
if (typeof window === 'undefined' && !supabaseServiceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY saknas i miljön! Admin-operationer kommer att misslyckas.');
}

// Anpassad fetch-funktion med retry-logik för auth-endpoints
const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  
  // Max antal återförsök för auth-relaterade anrop
  const MAX_RETRIES = 3; // Reducerat från 5 till 3 för att minska DOS-risken
  const REQUEST_TIMEOUT = 10000; // 10 sekunder timeout
  let retryCount = 0;
  let lastError: Error | null = null;
  let originalAuthError: any = null; // Store original auth errors
  
  // Lista på permanenta felkoder som inte bör återförsökas
  const PERMANENT_ERROR_CODES = [
    'refresh_token_not_found',    // Refresh token saknas helt
    'refresh_token_invalid',      // Refresh token är ogiltig
    'refresh_token_revoked',      // Refresh token har återkallats
    'invalid_grant',              // Generellt OAuth-relaterat fel
    'invalid_refresh_token',      // Ogiltig refresh token
    'token_expired',              // Token har gått ut
    'session_not_found'           // Session hittades inte
  ];
  
  // Auth error patterns that should be preserved
  const AUTH_ERROR_PATTERNS = [
    'invalid login credentials',
    'invalid credentials', 
    'email not confirmed',
    'email is not confirmed',
    'not confirmed',
    'email_not_confirmed',
    'signup requires email confirmation'
  ];
  
  while (retryCount < MAX_RETRIES) {
    try {
      // Använd bara retry för auth-relaterade anrop
      if (retryCount > 0 && !url.includes('/auth/')) {
        break;
      }
      
      // Om det är ett återförsök, vänta med exponentiell backoff
      if (retryCount > 0) {
        const delay = Math.pow(2, retryCount - 1) * 200; // 200ms, 400ms, 800ms
        // console.log(`Återförsök ${retryCount}/${MAX_RETRIES} efter ${delay}ms för ${url}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Lägg till timeout för att förhindra hängningar
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Om svaret indikerar fel, hantera det
      if (!response.ok) {
        let errorCode = '';
        let errorData = '';
        let errorResponse: any = null;
        
        try {
          // Försök läsa felmeddelandet från svaret
          errorResponse = await response.clone().json();
          errorData = JSON.stringify(errorResponse);
          errorCode = errorResponse.code || errorResponse.error_code || '';
          
          // Check if this is an auth error that should be preserved
          const isAuthError = AUTH_ERROR_PATTERNS.some(pattern => 
            errorResponse.message?.toLowerCase().includes(pattern) ||
            errorResponse.error_description?.toLowerCase().includes(pattern) ||
            errorData.toLowerCase().includes(pattern)
          );
          
          if (isAuthError) {
            // Store the original auth error to preserve it
            originalAuthError = errorResponse;
            
            // Create an error that matches the original auth error format
            const authError = new Error(errorResponse.message || errorResponse.error_description || 'Authentication error');
            authError.name = 'AuthError';
            (authError as any).code = errorCode;
            throw authError;
          }
        } catch (e) {
          // If it's already an auth error, re-throw it
          if (e instanceof Error && e.name === 'AuthError') {
            throw e;
          }
          // Ignorera fel vid läsning av felmeddelande
        }
        
        // Kontrollera för auth-fel med 403-status
        if (!response.ok && response.status === 403) {
          const errorText = await response.text();
          let error403Data;
          try {
            error403Data = JSON.parse(errorText);
          } catch {
            error403Data = errorText;
          }
          
          // Kontrollera för user_not_found fel
          if (error403Data?.code === 'user_not_found' || error403Data?.message?.includes('User from sub claim in JWT does not exist')) {
            // console.log('User not found in JWT - forcerar utloggning');
            
            // Forcera utloggning på klientsidan
            if (typeof window !== 'undefined') {
              // Rensa all auth-data
              const authKeys = ['sb-auth-token', 'sb-kjsquvjzctdwgjypcjrg-auth-token', 'sb-auth'];
              authKeys.forEach(key => {
                safeLocalStorage.removeItem(key);
                sessionStorage.removeItem(key);
              });
              
              // Rensa cookies
              document.cookie.split(";").forEach((c) => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                if (name.trim().includes('sb-') || name.trim().includes('auth')) {
                  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                }
              });
              
              // Skicka event för att UI ska hantera utloggning
              const signOutEvent = new CustomEvent('supabase.auth.signout', { 
                detail: { 
                  reason: 'user_not_found',
                  message: 'Användaren hittades inte, loggar ut automatiskt'
                }
              });
              window.dispatchEvent(signOutEvent);
              
              // Redirecta till startsidan efter en kort fördröjning
              setTimeout(() => {
                window.location.href = '/';
              }, 100);
            }
            
            const authError = new Error('User not found - automatically signed out');
            authError.name = 'AuthError';
            throw authError;
          }
          
          // Sätt som original auth error för andra 403-fel
          originalAuthError = error403Data;
        }
        
        // Kontrollera om detta är ett permanent fel som inte bör återförsökas
        const isPermanentError = PERMANENT_ERROR_CODES.some(code => 
          errorData.includes(code) || errorCode === code
        ) || (response.status === 400 && url.includes('/auth/v1/token'));
        
        if (isPermanentError) {
          // console.log(`Avbryter återförsök: Permanent fel detekterat i response`);
          
          // För auth-fel, bevara det ursprungliga felet
          if (originalAuthError) {
            const authError = new Error(originalAuthError.message || originalAuthError.error_description || 'Authentication error');
            (authError as any).code = originalAuthError.code || originalAuthError.error_code;
            throw authError;
          }
          
          // Skicka ett globalt event för att hantera sessionsfel i UI
          if (typeof window !== 'undefined') {
            const errorEvent = new CustomEvent('supabase.auth.error', { 
              detail: { 
                error: { message: `Auth error: ${errorData}` },
                message: 'Permanent auth error',
                shouldSignOut: true
              }
            });
            window.dispatchEvent(errorEvent);
          }
          
          break; // Avbryt återförsök för permanenta fel
        }
        
        // Kasta ett fel för att triggra nästa återförsök
        lastError = new Error(`Fetch misslyckades med status: ${response.status} (${errorData})`);
        throw lastError;
      }
      
      // Om svaret är OK, returnera det
      return response;
    } catch (error: any) {
      // If this is a preserved auth error, don't retry and throw it immediately
      if (error.name === 'AuthError') {
        throw error;
      }
      
      // Uppdatera det senaste felet
      lastError = error;
      
      // Öka antalet försök
      retryCount++;
      
      // Om vi nått max antal försök, kasta felet vidare
      if (retryCount >= MAX_RETRIES) {
        console.error(`Fetch-försök ${retryCount} misslyckades:`, error);
        console.error('Feldetaljer:', error);
        
        throw error;
      }
      
      // Kontrollera om detta är ett permanent fel som inte bör återförsökas
      const isPermanentError = PERMANENT_ERROR_CODES.some(code => 
        error.message?.includes(code)
      );
      
      if (isPermanentError) {
        // console.log(`Avbryter återförsök: Permanent fel detekterat i error`);
        
        // Skicka ett globalt event för att hantera sessionsfel i UI
        if (typeof window !== 'undefined') {
          const errorEvent = new CustomEvent('supabase.auth.error', { 
            detail: { 
              error: lastError,
              message: lastError?.message || 'Permanent auth error'
            }
          });
          window.dispatchEvent(errorEvent);
        }
        
        break; // Avbryt återförsök för permanenta fel
      }
    }
  }
  
  // If we have an original auth error, preserve it instead of transforming to connection error
  if (originalAuthError) {
    const authError = new Error(originalAuthError.message || originalAuthError.error_description || 'Authentication error');
    (authError as any).code = originalAuthError.code || originalAuthError.error_code;
    throw authError;
  }
  
  // Om vi kommer hit har alla återförsök misslyckats
  const detailedError = new Error(
    lastError 
      ? `Anslutningsfel: ${lastError.message}. Kontrollera din internetanslutning och försök igen.`
      : 'Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen.'
  );
  
  // Bevara ursprungligt fel som cause om det finns
  if (lastError) {
    detailedError.cause = lastError;
  }
  
  throw detailedError;
};

// Förbättrad storage-implementation som använder cookies som primär källa
const cookieAwareStorage = {
  getItem: (key: string): string | null => {
    try {
      // Försök cookies först för auth-tokens
      if (typeof document !== 'undefined' && key.includes('auth')) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === key && value) {
            return decodeURIComponent(value);
          }
        }
      }
      
      // Fallback till localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = localStorage.getItem(key);
        if (value) return value;
      }
      
      return null;
    } catch (error) {
      console.warn(`Storage getItem error for key ${key}:`, error);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    try {
      // Sätt i localStorage först
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
      
      // För auth-tokens, sätt också som cookie för bättre persistens
      if (typeof document !== 'undefined' && key.includes('auth')) {
        const isProduction = process.env.NODE_ENV === 'production';
        
        // Förbättrad domain-logik
        let domain = '';
        if (isProduction && typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          
          // Explicit hantering av olika produktionsdomäner
          if (hostname === 'www.handbok.org' || hostname === 'handbok.org') {
            domain = '.handbok.org';
          } else if (hostname.endsWith('.handbok.org')) {
            domain = '.handbok.org';
          }
          // För andra domäner, använd ingen domain (låt browsern bestämma)
        }
        
        const cookieOptions = [
          `${key}=${encodeURIComponent(value)}`,
          'path=/',
          'max-age=' + (7 * 24 * 60 * 60), // 7 days
          'samesite=lax'
        ];
        
        // Lägg till domain endast om vi är i produktion och har en giltig domain
        if (domain && isProduction) {
          cookieOptions.push(`domain=${domain}`);
        }
        
        // Secure flag endast för HTTPS
        if (isProduction && typeof window !== 'undefined' && window.location.protocol === 'https:') {
          cookieOptions.push('secure');
        }
        
        const cookieString = cookieOptions.join('; ');
        console.log(`🍪 [Supabase] Setting auth cookie with options:`, {
          key: key.substring(0, 20) + '...',
          domain: domain || 'none',
          secure: isProduction && typeof window !== 'undefined' && window.location.protocol === 'https:',
          environment: isProduction ? 'production' : 'development',
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
        });
        
        document.cookie = cookieString;
      }
    } catch (error) {
      console.warn(`Storage setItem error for key ${key}:`, error);
    }
  },
  
  removeItem: (key: string): void => {
    try {
      // Ta bort från localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
      
      // Ta bort cookie om det finns
      if (typeof document !== 'undefined') {
        const isProduction = process.env.NODE_ENV === 'production';
        
        // Samma domain-logik som setItem
        let domain = '';
        if (isProduction && typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          
          if (hostname === 'www.handbok.org' || hostname === 'handbok.org') {
            domain = '.handbok.org';
          } else if (hostname.endsWith('.handbok.org')) {
            domain = '.handbok.org';
          }
        }
        
        const cookieOptions = [
          `${key}=`,
          'path=/',
          'expires=Thu, 01 Jan 1970 00:00:00 GMT'
        ];
        
        if (domain && isProduction) {
          cookieOptions.push(`domain=${domain}`);
        }
        
        document.cookie = cookieOptions.join('; ');
        
        // Försök även utan domain för säkerhets skull
        if (domain) {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      }
    } catch (error) {
      console.warn(`Storage removeItem error for key ${key}:`, error);
    }
  }
};

// Singleton pattern för Supabase-klient för att förhindra multipla instanser
// Skapa en Supabase-klient för klientsidan - ANVÄNDER SINGLETON FRÅN supabase-client.ts
function createSupabaseClient(): SupabaseClient<Database> {
  // Import and use the singleton from supabase-client.ts to prevent multiple instances
  const { getSupabaseClient } = require('./supabase-client');
  // console.log('♻️ Supabase: Using singleton from supabase-client');
  
  return getSupabaseClient() as SupabaseClient<Database>;
}

export const supabase = createSupabaseClient();

// Hjälpfunktion för att synkronisera cookies till localStorage
export const syncCookiesToLocalStorage = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  try {
    const cookies = document.cookie.split(';');
    let syncedCount = 0;
    
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name && value && name.startsWith('sb-')) {
        try {
          const decodedValue = decodeURIComponent(value);
          localStorage.setItem(name, decodedValue);
          syncedCount++;
        } catch (e) {
          console.warn(`Could not sync cookie ${name} to localStorage:`, e);
        }
      }
    }
    
    if (syncedCount > 0) {
      // console.log(`Synced ${syncedCount} auth cookies to localStorage`);
    }
  } catch (error) {
    console.warn('Error syncing cookies to localStorage:', error);
  }
};

// Skapa en Supabase-klient med service role key (endast för server-side)
export const getServiceSupabase = () => {
  // Tyst fallback till vanlig klient på klientsidan för att undvika konsolvarningar
  if (typeof window !== 'undefined') {
    return supabase;
  }

  if (!supabaseServiceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY saknas! Admin-operationer kommer att misslyckas.');
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// Skapa en admin-klient som alltid använder service role key
// Bör endast användas i server-komponenter och API-routes
let adminClientInstance: SupabaseClient<Database> | null = null;

export const getAdminClient = () => {
  // Tyst fallback till vanlig klient på klientsidan för att undvika konsolvarningar
  if (typeof window !== 'undefined') {
    // När vi är på klientsidan, returnera standard-klienten istället
    // Detta undviker varningen i konsolloggen
    return supabase;
  }

  if (!adminClientInstance && supabaseServiceRoleKey) {
    adminClientInstance = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  if (!adminClientInstance) {
    console.error('Kunde inte skapa admin-klient! SUPABASE_SERVICE_ROLE_KEY saknas.');
    throw new Error('Admin-klient kunde inte skapas - service role key saknas');
  }

  return adminClientInstance;
};

// Hjälpfunktion för att testa databaskoppling
export async function testDatabaseConnection() {
  try {
    // Logga diagnostisk information
    // console.log('Testar databaskoppling...');
    // console.log('Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'Saknas');
    // console.log('Anon Key finns:', !!supabaseAnonKey);
    // console.log('Service Role Key finns:', !!supabaseServiceRoleKey);
    // console.log('Node Environment:', process.env.NODE_ENV);
    // console.log('Is Edge Runtime:', typeof EdgeRuntime !== 'undefined');
    
    const client = getServiceSupabase();
    // console.log('Anropar Supabase API...');
    
    try {
      const startTime = Date.now();
      const { data, error } = await client.from('handbooks').select('count').limit(1);
      const endTime = Date.now();
      
      if (error) {
        console.error('Databasfel:', error.message, error);
        return { 
          connected: false, 
          error: error.message, 
          details: error.details || error.hint || null,
          errorCode: error.code,
          timing: endTime - startTime
        };
      }
      
      // console.log('Databasanslutning lyckades efter', endTime - startTime, 'ms');
      return { connected: true, error: null, data, timing: endTime - startTime };
    } catch (queryError) {
      console.error('Fel vid databasförfrågan:', queryError);
      return { 
        connected: false, 
        error: queryError.message || 'Okänt databasfel', 
        details: queryError.cause ? String(queryError.cause) : null,
        stack: queryError.stack ? queryError.stack.split('\n').slice(0, 3).join('\n') : null,
        errorName: queryError.name
      };
    }
  } catch (error) {
    console.error('Kritiskt fel vid test av databasanslutning:', error);
    return { 
      connected: false, 
      error: error.message || 'Okänt kritiskt fel', 
      details: error.cause ? String(error.cause) : null,
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
      errorName: error.name
    };
  }
}

// Hjälpfunktion för att diagnostisera auth-problem i produktion
export async function diagnoseAuthIssues() {
  if (typeof window === 'undefined') return null;
  
  const diagnostics = {
    environment: process.env.NODE_ENV,
    hostname: window.location.hostname,
    cookieDomain: process.env.NODE_ENV === 'production' ? 
      (process.env.NEXT_PUBLIC_HANDBOOK_DOMAIN ? `.${process.env.NEXT_PUBLIC_HANDBOOK_DOMAIN}` :
       (window.location.hostname.includes('handbok.org') ? '.handbok.org' : undefined)) : 
      undefined,
    hasSupabaseUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    cookies: document.cookie,
    localStorage: null as any,
    sessionStorage: null as any,
    authSession: null as any
  };
  
  // Testa localStorage access
  try {
    // Use safe access to prevent errors
    if (typeof window !== 'undefined' && window.safeStorage) {
      window.safeStorage.getItem('test');
      diagnostics.localStorage = 'accessible';
    } else {
      // Safe test without throwing errors
      const testKey = '__diag_test__';
      const success = safeLocalStorage.setItem(testKey, 'test');
      if (success) {
        safeLocalStorage.removeItem(testKey);
        diagnostics.localStorage = 'accessible';
      } else {
        diagnostics.localStorage = 'blocked: safe storage failed';
      }
    }
  } catch (e) {
    diagnostics.localStorage = `blocked: ${e.message}`;
  }
  
  // Testa sessionStorage access
  try {
    const testKey = '__diag_session_test__';
    window.sessionStorage.setItem(testKey, 'test');
    window.sessionStorage.removeItem(testKey);
    diagnostics.sessionStorage = 'accessible';
  } catch (e) {
    diagnostics.sessionStorage = `blocked: ${e.message}`;
  }
  
  // Hämta aktuell session från Supabase
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    diagnostics.authSession = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      error: error?.message || null
    };
  } catch (e) {
    diagnostics.authSession = { error: e.message };
  }
  
  return diagnostics;
}

// Debug-funktion för att testa cookie-sättning
export function testCookieAuth() {
  if (typeof window === 'undefined') {
    console.log('❌ Cannot test cookies on server side');
    return;
  }
  
  console.log('🧪 Testing Enhanced Cookie Authentication...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Hostname:', window.location.hostname);
  console.log('Protocol:', window.location.protocol);
  
  // Test cookie setting
  const testKey = 'test-auth-cookie';
  const testValue = JSON.stringify({
    access_token: 'test-token-123',
    user: { id: 'test-user', email: 'test@example.com' },
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
  
  // Use the same logic as cookieAwareStorage
  const isProduction = process.env.NODE_ENV === 'production';
  
  let domain = '';
  if (isProduction) {
    const hostname = window.location.hostname;
    
    if (hostname === 'www.handbok.org' || hostname === 'handbok.org') {
      domain = '.handbok.org';
    } else if (hostname.endsWith('.handbok.org')) {
      domain = '.handbok.org';
    }
  }
  
  const cookieOptions = [
    `${testKey}=${encodeURIComponent(testValue)}`,
    'path=/',
    'max-age=60', // 1 minute for testing
    'samesite=lax'
  ];
  
  if (domain && isProduction) {
    cookieOptions.push(`domain=${domain}`);
  }
  
  if (isProduction && window.location.protocol === 'https:') {
    cookieOptions.push('secure');
  }
  
  const cookieString = cookieOptions.join('; ');
  console.log('🍪 Setting test cookie:', cookieString);
  
  document.cookie = cookieString;
  
  // Test reading back
  setTimeout(() => {
    const cookies = document.cookie.split(';');
    const found = cookies.find(c => c.trim().startsWith(testKey + '='));
    
    if (found) {
      console.log('✅ Test cookie found:', found.trim());
      
      // Clean up
      document.cookie = `${testKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      if (domain) {
        document.cookie = `${testKey}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
      console.log('🧹 Test cookie cleaned up');
    } else {
      console.log('❌ Test cookie not found in:', document.cookie);
    }
    
    // Test API call
    console.log('🔍 Testing debug auth API...');
    fetch('/api/debug/auth')
      .then(r => r.json())
      .then(data => {
        console.log('📡 Debug auth API result:', data);
      })
      .catch(err => {
        console.error('❌ Debug auth API error:', err);
      });
  }, 100);
}

// Add function to upgrade service to latest client as needed
export function upgradeServiceClient() {
  if (typeof window === 'undefined' && supabaseServiceRoleKey) {
    return createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return getServiceSupabase();
}

// Expose debug functions globally for testing
if (typeof window !== 'undefined') {
  (window as any).testCookieAuth = testCookieAuth;
  (window as any).diagnoseAuthIssues = diagnoseAuthIssues;
  (window as any).syncCookiesToLocalStorage = syncCookiesToLocalStorage;
  (window as any).testBearerTokenAuth = testBearerTokenAuth;
  
  console.log('🧪 Auth debug functions available:');
  console.log('  - window.testCookieAuth() - Test cookie setting');
  console.log('  - window.diagnoseAuthIssues() - Full auth diagnostics');
  console.log('  - window.syncCookiesToLocalStorage() - Sync cookies to localStorage');
  console.log('  - window.testBearerTokenAuth(joinCode, role) - Test Bearer token join');
}

// Hjälpfunktion för att testa Bearer token från browser console
export async function testBearerTokenAuth(joinCode: string, role: string = 'viewer') {
  if (typeof window === 'undefined') {
    console.log('❌ This function only works in browser');
    return null;
  }
  
  console.log('🔍 Testing Bearer token authentication...');
  
  // Hämta access token från localStorage/sessionStorage
  function getAccessToken() {
    const storages = [localStorage, sessionStorage];
    
    for (let storage of storages) {
      const keys = Object.keys(storage);
      for (let key of keys) {
        // Förbättrad sökning för olika Supabase auth token-format
        if (key.includes('auth-token') || 
            (key.includes('supabase') && key.includes('auth')) ||
            key.startsWith('sb-') && key.includes('auth')) {
          try {
            const value = storage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed.access_token) {
                console.log('✅ Found access token in storage key:', key);
                return parsed.access_token;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }
    return null;
  }
  
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    console.log('❌ No access token found in storage');
    return null;
  }
  
  console.log('🔑 Found access token, testing join API...');
  
  try {
    const response = await fetch('/api/handbook/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        joinCode,
        role
      })
    });
    
    const result = await response.json();
    
    console.log('=== BEARER TOKEN JOIN TEST RESULTS ===');
    console.log('Status:', response.status);
    console.log('Success:', response.ok);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    return {
      status: response.status,
      ok: response.ok,
      data: result
    };
    
  } catch (error) {
    console.error('❌ Bearer token test failed:', error);
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

// Smart fetch-funktion som automatiskt lägger till Bearer token för join-requests
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  if (typeof window === 'undefined') {
    // Server-side: använd vanliga fetch
    return fetch(url, options);
  }
  
  // Client-side: försök få access token och lägg till som Bearer token
  const accessToken = getStoredAccessToken();
  
  if (accessToken) {
    // Lägg till Authorization header
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    
    console.log('🔑 [fetchWithAuth] Adding Bearer token to request for:', url);
    
    return fetch(url, {
      ...options,
      headers
    });
  } else {
    // Ingen access token, använd vanliga fetch (förlita sig på cookies)
    console.log('⚠️ [fetchWithAuth] No access token found, using regular fetch for:', url);
    return fetch(url, options);
  }
}

// Hjälpfunktion för att hämta access token från storage
function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const storages = [localStorage, sessionStorage];
    
    for (let storage of storages) {
      const keys = Object.keys(storage);
      for (let key of keys) {
        // Leta efter Supabase auth token-nycklar
        if (key.includes('auth-token') || 
            (key.includes('supabase') && key.includes('auth')) ||
            key.startsWith('sb-') && key.includes('auth')) {
          try {
            const value = storage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed.access_token) {
                return parsed.access_token;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }
  } catch (e) {
    console.error('Error getting stored access token:', e);
  }
  
  return null;
}
