/**
 * En klientklass för att ansluta till Supabase via vår serverless proxy-funktion.
 * Detta är ett alternativ när direktanslutning till Supabase inte fungerar 
 * i Vercel Edge Runtime.
 */
export class SupabaseProxyClient {
  private baseUrl: string;
  
  constructor(baseUrl?: string) {
    // Default är relativ URL på samma domän
    this.baseUrl = baseUrl || '/api/supabase-proxy';
  }
  
  /**
   * Utför en förfrågan mot vår proxy
   */
  private async request<T = any>(table: string, method: string, params: any = {}): Promise<{
    data: T | null;
    error: any | null;
  }> {
    try {
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
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        return { data: null, error: result.error };
      }
      
      return { data: result.data, error: null };
    } catch (error) {
      return {
        data: null, 
        error: {
          message: error.message,
          details: error.cause ? String(error.cause) : 'Unknown error',
        }
      };
    }
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