import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

// Skapa anpassad fetch för att hantera nätverksproblem och återförsök
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const MAX_RETRIES = 5;
  let error = null;
  
  // Säkerställer att URL:en har https-prefix
  const urlString = url.toString();
  const secureUrl = urlString.startsWith('http://') 
    ? urlString.replace('http://', 'https://') 
    : urlString.startsWith('https://') 
      ? urlString 
      : `https://${urlString}`;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Om vi är på andra eller senare försök, vänta lite innan vi försöker igen
      if (attempt > 0) {
        // Exponentiell backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms
        const delay = 200 * Math.pow(2, attempt);
        console.log(`Återförsök ${attempt + 1}/${MAX_RETRIES} efter ${delay}ms för ${secureUrl}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Logg för att spåra anrop i problemsökningssyfte
      if (process.env.DEBUG_SUPABASE === 'true') {
        console.log(`Fetch-anrop till: ${secureUrl}, försök ${attempt + 1}`);
      }
      
      const response = await fetch(secureUrl, {
        ...options,
        // Lägg till SSL-relaterade inställningar och andra viktiga inställningar
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          ...options?.headers,
        },
      });
      
      // Logg för att bekräfta svar
      if (process.env.DEBUG_SUPABASE === 'true') {
        console.log(`Svar från ${secureUrl}: ${response.status} ${response.statusText}`);
      }
      
      // Om svaret inte är OK, kasta ett fel för att utlösa återförsök
      if (!response.ok && attempt < MAX_RETRIES - 1) {
        throw new Error(`Fetch misslyckades med status: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (err) {
      error = err;
      console.error(`Fetch-försök ${attempt + 1} misslyckades:`, err);
      
      // Logg mer detaljerad information om felet
      if (err instanceof Error) {
        console.error(`Feldetaljer: ${err.name}: ${err.message}`);
        if (err.cause) {
          console.error(`Felorsak: ${String(err.cause)}`);
        }
      }
    }
  }
  
  // Om alla försök misslyckas, kasta det senaste felet med mer kontext
  const enhancedError = new Error(`Alla ${MAX_RETRIES} försök misslyckades för ${urlString}: ${error?.message || 'Okänt fel'}`);
  enhancedError.cause = error;
  throw enhancedError;
};

// Skapa basklassen för anonym klient
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
      detectSessionInUrl: typeof window !== 'undefined',
    },
    global: {
      fetch: customFetch,
    },
    db: {
      schema: 'public',
    },
    // Lägg till dessa inställningar för bättre prestanda/felhantering
    realtime: {
      timeout: 30000, // Öka timeout för realtidsanslutningar
    },
    // SSL-inställningar för säkra anslutningar
    maxRetries: 5,
  }
);

// Skapa admin-klienten för server-side operationer
let supabaseAdminClient: SupabaseClient | null = null;

// Funktion som skapar eller returnerar admin-klienten on-demand
export const getServiceSupabase = () => {
  // Endast skapa admin-klienten om vi är på server-sidan
  if (typeof window === 'undefined') {
    if (!supabaseAdminClient && supabaseServiceRoleKey) {
      try {
        // Logga URL för felsökning (utan att visa hela nyckeln)
        if (process.env.DEBUG_SUPABASE === 'true') {
          console.log('Skapar admin-klient med URL:', supabaseUrl);
        }

        supabaseAdminClient = createClient(
          supabaseUrl,
          supabaseServiceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
            global: {
              fetch: customFetch,
            },
            db: {
              schema: 'public',
            },
            // Förbättrade inställningar för server-side klienten
            realtime: {
              timeout: 30000,
            },
            // SSL-inställningar för säkra anslutningar
            maxRetries: 5,
          }
        );
        
        if (process.env.DEBUG_SUPABASE === 'true') {
          console.log('Admin-klient skapad:', !!supabaseAdminClient);
        }
      } catch (error) {
        console.error('Error creating Supabase admin client:', error);
        // Fallback till anonym klient om admin-klienten inte kunde skapas
        return supabase;
      }
    }
    
    // Om service-klienten existerar, returnera den, annars anonym klient
    return supabaseAdminClient || supabase;
  } else {
    // På klientsidan, returnera alltid den anonyma klienten
    return supabase;
  }
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

// Exportera admin-klienten för enklare användning
export const supabaseAdmin = getServiceSupabase();

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
