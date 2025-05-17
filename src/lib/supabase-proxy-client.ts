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
        
        const response = await fetch(this.baseUrl, {
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
        });
        
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
          return { data: null, error: result.error };
        }
        
        return { data: result.data, error: null };
      } catch (error) {
        retries++;
        console.error(`[SupabaseProxyClient] Fel vid försök ${retries}/${this.maxRetries + 1}:`, error);
        
        // Om det är sista försöket, returnera felet
        if (retries > this.maxRetries) {
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
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries - 1)));
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