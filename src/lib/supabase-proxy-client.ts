/**
 * En klientklass för att ansluta till Supabase via vår serverless proxy-funktion.
 * Detta är ett alternativ när direktanslutning till Supabase inte fungerar 
 * i Vercel Edge Runtime.
 */
export class SupabaseProxyClient {
  private baseUrl: string;
  private maxRetries: number;
  
  constructor(baseUrl?: string, maxRetries = 2) {
    // Default är relativ URL på samma domän
    this.baseUrl = baseUrl || '/api/supabase-proxy';
    this.maxRetries = maxRetries;
  }
  
  /**
   * Utför en förfrågan mot vår proxy
   */
  private async request<T = any>(table: string, method: string, params: any = {}): Promise<{
    data: T | null;
    error: any | null;
  }> {
    let retries = 0;
    
    while (retries <= this.maxRetries) {
      try {
        console.log(`[SupabaseProxyClient] Anropar ${this.baseUrl} (försök ${retries + 1}/${this.maxRetries + 1})`);
        
        const fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table,
            method,
            params,
          }),
          cache: 'no-store', // Undvik caching problem
        };
        
        // För att hantera problem med SSL och Cloudflare
        try {
          const response = await fetch(this.baseUrl, fetchOptions);
          
          if (!response.ok) {
            const errorData = await response.text();
            let parsedError;
            
            try {
              parsedError = JSON.parse(errorData);
            } catch (e) {
              parsedError = { message: errorData };
            }
            
            throw new Error(`HTTP error ${response.status}: ${parsedError.error || errorData}`, { 
              cause: parsedError 
            });
          }
          
          const result = await response.json();
          
          if (result.error) {
            // Om proxyn returnerar ett fel från Supabase
            console.warn(`[SupabaseProxyClient] Proxyn returnerade ett fel:`, result.error);
            
            // Om det är ett SSL-relaterat fel (Cloudflare)
            if (typeof result.error === 'string' && 
                (result.error.includes('526') || 
                 result.error.includes('SSL') || 
                 result.error.includes('certificate'))) {
              
              console.error('[SupabaseProxyClient] SSL-fel detekterat, detta kan bero på Cloudflare-validering');
              // Vi fortsätter med retries även för SSL-fel
              throw new Error('SSL-valideringsfel vid anslutning till Supabase via Cloudflare', {
                cause: { cloudflareError: true, details: result.error }
              });
            }
            
            return { data: null, error: result.error };
          }
          
          return { data: result.data, error: null };
        } catch (fetchError) {
          // Om det är ett nätverksfel
          if (fetchError.message.includes('fetch failed')) {
            console.error('[SupabaseProxyClient] Nätverksfel:', fetchError);
            // Vi fortsätter med retries
            throw fetchError;
          }
          // Andra fetch-fel kastas vidare
          throw fetchError;
        }
      } catch (error) {
        retries++;
        const waitTime = 500 * Math.pow(2, retries - 1);
        
        console.error(`[SupabaseProxyClient] Fel vid försök ${retries}/${this.maxRetries + 1}:`, error);
        console.log(`[SupabaseProxyClient] Väntar ${waitTime}ms innan nästa försök...`);
        
        // Om det är sista försöket, returnera felet
        if (retries > this.maxRetries) {
          // Särskild hantering för SSL-fel (Cloudflare)
          if (error.cause?.cloudflareError) {
            return {
              data: null, 
              error: {
                message: 'Cloudflare SSL-valideringsfel (Error 526)',
                details: 'Din Supabase-instans har antagligen problem med SSL-certifikatet eller Cloudflare-validering.',
                solution: 'Kontrollera Supabase-projektets status eller kontakta Supabase-support.',
                technicalDetails: error.cause,
                time: new Date().toISOString()
              }
            };
          }
          
          return {
            data: null, 
            error: {
              message: error.message || 'Ett okänt fel inträffade',
              details: error.cause ? error.cause : 'Kunde inte ansluta till Supabase-proxy',
              time: new Date().toISOString()
            }
          };
        }
        
        // Vänta innan nästa försök (exponentiell backoff)
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Denna kod bör aldrig nås, men TypeScript kräver en returvärde
    return {
      data: null,
      error: {
        message: 'Oväntat fel i retry-logiken',
        details: 'Detta bör aldrig inträffa'
      }
    };
  }
  
  /**
   * Hämta data från en tabell
   */
  async select<T = any>(
    table: string, 
    options: {
      columns?: string;
      filter?: { column: string; operator: string; value: any };
      limit?: number;
      single?: boolean;
    } = {}
  ): Promise<{ data: T | null; error: any | null }> {
    return this.request<T>(table, 'select', options);
  }
  
  /**
   * Lägg till data i en tabell
   */
  async insert<T = any>(
    table: string,
    records: any | any[]
  ): Promise<{ data: T | null; error: any | null }> {
    return this.request<T>(table, 'insert', { records });
  }
  
  /**
   * Uppdatera data i en tabell
   */
  async update<T = any>(
    table: string,
    updates: any,
    match: any
  ): Promise<{ data: T | null; error: any | null }> {
    return this.request<T>(table, 'update', { updates, match });
  }
  
  /**
   * Ta bort data från en tabell
   */
  async delete<T = any>(
    table: string,
    match: any
  ): Promise<{ data: T | null; error: any | null }> {
    return this.request<T>(table, 'delete', { matchDelete: match });
  }
} 