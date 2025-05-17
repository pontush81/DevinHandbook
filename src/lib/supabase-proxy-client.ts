/**
 * En klientklass för att ansluta till Supabase via vår serverless proxy-funktion.
 * Detta är ett alternativ när direktanslutning till Supabase inte fungerar 
 * i Vercel Edge Runtime.
 */
export class SupabaseProxyClient {
  private baseUrl: string;
  private maxRetries: number;
  private cloudflareErrorDetected: boolean = false;
  
  constructor(baseUrl?: string, maxRetries = 3) {
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
    source?: string;
  }> {
    let retries = 0;
    
    while (retries <= this.maxRetries) {
      try {
        console.log(`[SupabaseProxyClient] Anropar ${this.baseUrl} (försök ${retries + 1}/${this.maxRetries + 1})`);
        
        const fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            table,
            method,
            params,
            diagnostics: {
              timestamp: new Date().toISOString(),
              retry: retries,
              cloudflareErrorDetected: this.cloudflareErrorDetected
            }
          }),
          cache: 'no-store', // Undvik caching problem
        };
        
        // För att hantera problem med SSL och Cloudflare
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sekunder timeout
          
          const response = await fetch(this.baseUrl, {
            ...fetchOptions,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.text();
            let parsedError;
            
            try {
              parsedError = JSON.parse(errorData);
            } catch (e) {
              parsedError = { message: errorData };
            }
            
            // Specifik felhantering för statusar
            if (response.status === 502 || response.status === 503 || response.status === 504) {
              throw new Error(`Proxyn kunde inte nå Supabase (${response.status}): ${parsedError.error || errorData}`, { 
                cause: { 
                  gatewayError: true,
                  statusCode: response.status,
                  details: parsedError
                } 
              });
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
              this.cloudflareErrorDetected = true;
              
              // Vi fortsätter med retries även för SSL-fel
              throw new Error('SSL-valideringsfel vid anslutning till Supabase via Cloudflare', {
                cause: { cloudflareError: true, details: result.error }
              });
            }
            
            return { data: null, error: result.error, source: 'proxy' };
          }
          
          return { data: result.data, error: null, source: 'proxy' };
        } catch (fetchError) {
          // Om det är ett nätverksfel
          if (fetchError.message && (
              fetchError.message.includes('fetch failed') ||
              fetchError.message.includes('network') ||
              fetchError.message.includes('abort') ||
              fetchError.message.includes('timeout'))) {
            console.error('[SupabaseProxyClient] Nätverksfel:', fetchError.message);
            // Vi fortsätter med retries
            throw fetchError;
          }
          
          // Om det är ett Cloudflare-fel
          if (fetchError.message && (
              fetchError.message.includes('526') ||
              fetchError.message.includes('SSL') ||
              fetchError.message.includes('certificate'))) {
            console.error('[SupabaseProxyClient] Cloudflare SSL-fel:', fetchError.message);
            this.cloudflareErrorDetected = true;
          }
          
          // Andra fetch-fel kastas vidare
          throw fetchError;
        }
      } catch (error) {
        retries++;
        const waitTime = 500 * Math.pow(2, retries - 1); // Exponentiell backoff
        
        console.error(`[SupabaseProxyClient] Fel vid försök ${retries}/${this.maxRetries + 1}:`, error.message);
        
        // Om vi upptäcker ett Cloudflare-fel, märk det
        if (error.message && (
            error.message.includes('526') ||
            error.message.includes('SSL') ||
            error.message.includes('certificate'))) {
          this.cloudflareErrorDetected = true;
        }
        
        // Om det är ett Gateway/timeout-fel
        if (error.cause?.gatewayError) {
          console.warn(`[SupabaseProxyClient] Gateway-fel (${error.cause.statusCode}), väntar ${waitTime}ms...`);
        } else {
          console.log(`[SupabaseProxyClient] Väntar ${waitTime}ms innan nästa försök...`);
        }
        
        // Om det är sista försöket, returnera felet
        if (retries > this.maxRetries) {
          // Särskild hantering för SSL-fel (Cloudflare)
          if (error.cause?.cloudflareError || this.cloudflareErrorDetected) {
            return {
              data: null, 
              error: {
                message: 'Cloudflare SSL-valideringsfel (Error 526)',
                details: 'Din Supabase-instans har antagligen problem med SSL-certifikatet eller Cloudflare-validering.',
                solution: 'Kontrollera Supabase-projektets status eller kontakta Supabase-support.',
                technicalDetails: error.cause,
                time: new Date().toISOString(),
                cloudflareError: true
              },
              source: 'proxy-error'
            };
          }
          
          // Hantering för gateway-fel
          if (error.cause?.gatewayError) {
            return {
              data: null,
              error: {
                message: `Gateway-fel (HTTP ${error.cause.statusCode})`,
                details: 'Proxy-servern kunde inte nå Supabase. Detta kan bero på tillfälliga nätverksproblem.',
                solution: 'Försök igen senare eller kontrollera Supabase-projektets status.',
                technicalDetails: error.cause,
                time: new Date().toISOString(),
                gatewayError: true
              },
              source: 'proxy-error'
            };
          }
          
          return {
            data: null, 
            error: {
              message: error.message || 'Ett okänt fel inträffade',
              details: error.cause ? error.cause : 'Kunde inte ansluta till Supabase-proxy',
              time: new Date().toISOString()
            },
            source: 'proxy-error'
          };
        }
        
        // Vänta innan nästa försök (exponentiell backoff)
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Denna kod bör aldrig nås, men TypeScript kräver ett returvärde
    return {
      data: null,
      error: {
        message: 'Oväntat fel i retry-logiken',
        details: 'Detta bör aldrig inträffa'
      },
      source: 'proxy-error'
    };
  }
  
  /**
   * Återställ status för Cloudflare-fel
   */
  resetCloudflareErrorStatus() {
    this.cloudflareErrorDetected = false;
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
  ): Promise<{ data: T | null; error: any | null; source?: string }> {
    return this.request<T>(table, 'select', options);
  }
  
  /**
   * Lägg till data i en tabell
   */
  async insert<T = any>(
    table: string,
    records: any | any[]
  ): Promise<{ data: T | null; error: any | null; source?: string }> {
    return this.request<T>(table, 'insert', { records });
  }
  
  /**
   * Uppdatera data i en tabell
   */
  async update<T = any>(
    table: string,
    updates: any,
    match: any
  ): Promise<{ data: T | null; error: any | null; source?: string }> {
    return this.request<T>(table, 'update', { updates, match });
  }
  
  /**
   * Ta bort data från en tabell
   */
  async delete<T = any>(
    table: string,
    match: any
  ): Promise<{ data: T | null; error: any | null; source?: string }> {
    return this.request<T>(table, 'delete', { matchDelete: match });
  }
} 