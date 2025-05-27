import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

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
  console.log('Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing', supabaseUrl ? `(${supabaseUrl.substring(0, 12)}...)` : '');
  console.log('Supabase Anon Key:', supabaseAnonKey ? '✓ Set' : '✗ Missing', supabaseAnonKey ? '(längd: ' + supabaseAnonKey.length + ')' : '');
  console.log('Supabase Service Role Key:', supabaseServiceRoleKey ? '✓ Set' : '✗ Missing', supabaseServiceRoleKey ? '(längd: ' + supabaseServiceRoleKey.length + ')' : '');
  console.log('Node Environment:', process.env.NODE_ENV);
  console.log('Is Edge Runtime:', typeof EdgeRuntime !== 'undefined');
  console.log('Vercel Deployment:', process.env.VERCEL_URL || 'inte i Vercel');
}

if (typeof window !== 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase miljövariabler saknas! Applikationen kommer inte att fungera korrekt.');
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
  
  while (retryCount < MAX_RETRIES) {
    try {
      // Använd bara retry för auth-relaterade anrop
      if (retryCount > 0 && !url.includes('/auth/')) {
        break;
      }
      
      // Om det är ett återförsök, vänta med exponentiell backoff
      if (retryCount > 0) {
        const delay = Math.pow(2, retryCount - 1) * 200; // 200ms, 400ms, 800ms
        console.log(`Återförsök ${retryCount}/${MAX_RETRIES} efter ${delay}ms för ${url}`);
        
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
        
        try {
          // Försök läsa felmeddelandet från svaret
          const errorResponse = await response.clone().json();
          errorData = JSON.stringify(errorResponse);
          errorCode = errorResponse.code || errorResponse.error_code || '';
        } catch (e) {
          // Ignorera fel vid läsning av felmeddelande
        }
        
        // Kontrollera om detta är ett permanent fel som inte bör återförsökas
        const isPermanentError = PERMANENT_ERROR_CODES.some(code => 
          errorData.includes(code) || errorCode === code
        ) || (response.status === 400 && url.includes('/auth/v1/token'));
        
        if (isPermanentError) {
          console.log(`Avbryter återförsök: Permanent fel detekterat i error`);
          
          // För auth-fel, rensa session och omdirigera
          if (url.includes('/auth/v1/token') || PERMANENT_ERROR_CODES.some(code => 
            errorData.includes(code) || errorCode === code
          )) {
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
        console.log(`Avbryter återförsök: Permanent fel detekterat i error`);
        
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
  
  // Om vi kommer hit har alla återförsök misslyckats
  throw lastError || new Error('Okänt fel vid fetch');
};

// Skapa en Supabase-klient för klientsidan med ENDAST cookies
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Konfigurera cookies för optimal cross-domain kompatibilitet
      cookieOptions: {
        name: 'sb-auth',
        lifetime: 60 * 60 * 24 * 7,
        domain: process.env.NODE_ENV === 'production' ? '.handbok.org' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false // Tillåt JavaScript att läsa för att underlätta debugging
      },
      // Använd null för att tvinga cookie-baserad lagring och undvika localStorage-fel
      storage: null
    },
    global: {
      fetch: typeof window !== 'undefined' ? customFetch : undefined,
    },
    debug: process.env.NODE_ENV !== 'production'
  }
);

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
    console.log('Testar databaskoppling...');
    console.log('Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'Saknas');
    console.log('Anon Key finns:', !!supabaseAnonKey);
    console.log('Service Role Key finns:', !!supabaseServiceRoleKey);
    console.log('Node Environment:', process.env.NODE_ENV);
    console.log('Is Edge Runtime:', typeof EdgeRuntime !== 'undefined');
    
    const client = getServiceSupabase();
    console.log('Anropar Supabase API...');
    
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
      
      console.log('Databasanslutning lyckades efter', endTime - startTime, 'ms');
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

export type Database = {
  public: {
    Tables: {
      handbooks: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          subdomain: string;
          user_id: string | null;
          published: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          subdomain: string;
          user_id?: string | null;
          published?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          subdomain?: string;
          user_id?: string | null;
          published?: boolean;
        };
      };
      sections: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string;
          order: number;
          handbook_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          description: string;
          order: number;
          handbook_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          description?: string;
          order?: number;
          handbook_id?: string;
        };
      };
      pages: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          content: string;
          order: number;
          section_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          content: string;
          order: number;
          section_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          content?: string;
          order?: number;
          section_id?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          file_path: string;
          handbook_id: string;
          section_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          file_path: string;
          handbook_id: string;
          section_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          file_path?: string;
          handbook_id?: string;
          section_id?: string | null;
        };
      };
    };
  };
};
