import { PostgrestClient } from '@supabase/postgrest-js';

// Direktanslutning till Supabase Postgres REST API utan att gå genom supabase-js
export function createDirectClient() {
  // Ensure URL has https prefix
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const postgrestUrl = supabaseUrl.startsWith('http')
    ? `${supabaseUrl}/rest/v1`
    : `https://${supabaseUrl}/rest/v1`;
  
  console.log(`Creating direct PostgrestClient for ${postgrestUrl}`);
  
  // Create direct PostgrestClient
  const postgrest = new PostgrestClient(postgrestUrl, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    schema: 'public',
    fetch: customFetch,
  });
  
  return postgrest;
}

// Denna anpassade fetch-funktion använder ett annat tillvägagångssätt
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const MAX_RETRIES = 5;
  let error = null;
  
  // URL-hantering
  const urlString = url.toString();
  
  // Sätt upp headers för bättre kompatibilitet
  const headers = new Headers(options?.headers || {});
  headers.set('Content-Type', 'application/json');
  
  // Se till att vi har den optimala anslutningsinställningen
  headers.set('Connection', 'keep-alive');
  
  // Logg för debugging
  console.log(`Direct DB fetch till: ${urlString.substring(0, 50)}...`);
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Lägg till fördröjning för återförsök
      if (attempt > 0) {
        const delay = 300 * Math.pow(2, attempt);
        console.log(`Återförsök ${attempt + 1}/${MAX_RETRIES} efter ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Undvik timeout genom att sätta en rimlig gräns
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 sekunder
      
      const response = await fetch(urlString, {
        ...options,
        headers,
        signal: controller.signal,
        // Dessa inställningar har hjälpt i andra fall med SSL-problem
        cache: 'no-store',
        credentials: 'omit', // Försök utan credentials
      });
      
      clearTimeout(timeoutId);
      
      return response;
    } catch (err) {
      error = err;
      console.error(`Direktanslutning misslyckades (försök ${attempt + 1}):`, err.message);
    }
  }
  
  throw new Error(`Alla ${MAX_RETRIES} direktanslutningsförsök misslyckades: ${error?.message}`);
};

// Hjälpfunktion för att testa direktanslutning
export async function testDirectConnection() {
  try {
    const client = createDirectClient();
    console.log('Testar direktanslutning...');
    
    const startTime = Date.now();
    const { data, error } = await client
      .from('handbooks')
      .select('count')
      .limit(1);
    
    const endTime = Date.now();
    
    if (error) {
      return { 
        connected: false, 
        error: error.message, 
        details: error.details || null,
        method: 'direct-postgrest'
      };
    }
    
    return { 
      connected: true, 
      data, 
      timing: endTime - startTime,
      method: 'direct-postgrest'
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error.message, 
      details: error.cause ? String(error.cause) : null,
      method: 'direct-postgrest'
    };
  }
} 