import { createClient } from '@supabase/supabase-js';

// Lista över publika CORS-proxyer som kan användas
const PROXY_URLS = [
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/get?url='
];

// Skapar en Supabase-klient som går via en CORS-proxy
export function createProxyClient() {
  // Supabase-konfiguration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Använd den första proxyn i listan som standard
  const proxyIndex = 0;
  const proxyUrl = PROXY_URLS[proxyIndex];
  
  console.log(`Creating proxy client with ${proxyUrl}`);
  
  // Skapa en anpassad fetch-funktion som går via proxy
  const proxyFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
    try {
      const urlStr = url.toString();
      
      // Skapa den proxade URL:en
      const proxiedUrl = `${proxyUrl}${encodeURIComponent(urlStr)}`;
      console.log(`Sending proxy request to: ${proxiedUrl.substring(0, 50)}...`);
      
      // Skapa en tidsgräns för att undvika hängande förfrågningar
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sekunder
      
      // Sätt upp headers för bättre kompatibilitet
      const headers = new Headers(options?.headers || {});
      
      // Anpassa headers för specifika proxyer
      if (proxyIndex === 0) { // corsproxy.io
        headers.set('x-requested-with', 'XMLHttpRequest');
      }
      
      const response = await fetch(proxiedUrl, {
        ...options,
        headers,
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      // För vissa proxyer behöver vi hantera svaret annorlunda
      if (proxyIndex === 2) { // allorigins
        const jsonResponse = await response.json();
        // Skapa en ny Response från den egentliga innehållet
        return new Response(jsonResponse.contents, {
          status: 200,
          headers: new Headers({
            'Content-Type': 'application/json'
          })
        });
      }
      
      return response;
    } catch (error) {
      console.error('Proxy fetch error:', error);
      throw error;
    }
  };
  
  // Använd den proxade fetch-funktionen för att skapa Supabase-klienten
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: proxyFetch,
    },
  });
}

// Testa anslutningen via proxy
export async function testProxyConnection() {
  try {
    console.log('Testar proxy-anslutning...');
    const client = createProxyClient();
    
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
        method: 'proxy'
      };
    }
    
    return { 
      connected: true, 
      data, 
      timing: endTime - startTime,
      method: 'proxy'
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error.message, 
      details: error.cause ? String(error.cause) : null,
      method: 'proxy'
    };
  }
}

// Skapa handbok via proxy-anslutning
export async function createHandbookViaProxy(name: string, slug: string, userId?: string) {
  try {
    const client = createProxyClient();
    
    const { data, error } = await client
      .from('handbooks')
      .insert([{
        title: name,
        slug: slug,
        owner_id: userId || null,
        published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Fel vid handboksskapande via proxy:', error);
    throw error;
  }
} 