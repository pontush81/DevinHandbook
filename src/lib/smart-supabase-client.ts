import { PostgrestClient } from '@supabase/postgrest-js';
import { SupabaseProxyClient } from './supabase-proxy-client';
import { createDirectClient } from './direct-db';

/**
 * SmartSupabaseClient prioriterar direktanslutning istället för proxy
 * med automatisk fallback till proxy om direktanslutningen misslyckas.
 */
export class SmartSupabaseClient {
  private directClient: PostgrestClient | null;
  private proxyClient: SupabaseProxyClient;
  private connectionStatus: {
    directWorks: boolean;
    proxyWorks: boolean;
    lastChecked: Date;
    lastError: {
      direct: string | null;
      proxy: string | null;
      timestamp: Date | null;
    };
    attemptCount: {
      direct: number;
      proxy: number;
    };
    cloudflareIssueDetected: boolean;
  };
  
  constructor() {
    try {
      this.directClient = createDirectClient();
    } catch (err) {
      console.warn('Kunde inte skapa direktklient:', err.message);
      this.directClient = null;
    }
    
    this.proxyClient = new SupabaseProxyClient();
    
    this.connectionStatus = {
      directWorks: true, // Antar att det fungerar från början
      proxyWorks: true,
      lastChecked: new Date(),
      lastError: {
        direct: null,
        proxy: null,
        timestamp: null
      },
      attemptCount: {
        direct: 0,
        proxy: 0
      },
      cloudflareIssueDetected: false
    };
    
    // Självdiagnos vid start
    this.selfDiagnose();
  }
  
  /**
   * Kör en självdiagnos när klienten startar för att avgöra vilken anslutningsmetod som fungerar bäst
   */
  private async selfDiagnose() {
    try {
      console.log('[SmartSupabaseClient] Kör självdiagnos...');
      const result = await this.testConnections();
      
      if (result.directWorks) {
        console.log('[SmartSupabaseClient] Direktanslutning fungerar, använder denna primärt');
        this.connectionStatus.directWorks = true;
        this.connectionStatus.attemptCount.direct = 0;
      } else if (result.proxyWorks) {
        console.log('[SmartSupabaseClient] Direktanslutning fungerar inte, men proxy fungerar');
        this.connectionStatus.directWorks = false;
        this.connectionStatus.proxyWorks = true;
      } else {
        console.warn('[SmartSupabaseClient] Varken direkt eller proxy-anslutning fungerar!');
      }
      
      // Kontrollera om det finns Cloudflare-problem
      if (result.cloudflareIssue) {
        console.warn('[SmartSupabaseClient] Cloudflare SSL-problem upptäckt');
        this.connectionStatus.cloudflareIssueDetected = true;
      }
    } catch (err) {
      console.error('[SmartSupabaseClient] Fel vid självdiagnos:', err.message);
    }
  }
  
  /**
   * Hämta data från en tabell med automatisk felhantering
   */
  async select<T = any>(
    table: string, 
    options: {
      columns?: string;
      filter?: { column: string; operator: string; value: any };
      limit?: number;
      single?: boolean;
    } = {}
  ): Promise<{ data: T | null; error: any | null; source: string }> {
    // För direktfrågan behöver vi konvertera filter om det finns
    const buildDirectQuery = () => {
      let query = this.directClient!.from(table).select(options.columns || '*');
      
      if (options.filter) {
        const { column, operator, value } = options.filter;
        
        // PostgrestClient stödjer inte samma operatörsyntax, så vi bygger frågan manuellt
        switch (operator) {
          case 'eq':
            query = query.eq(column, value);
            break;
          case 'neq':
            query = query.neq(column, value);
            break;
          case 'gt':
            query = query.gt(column, value);
            break;
          case 'lt':
            query = query.lt(column, value);
            break;
          case 'gte':
            query = query.gte(column, value);
            break;
          case 'lte':
            query = query.lte(column, value);
            break;
          case 'like':
            query = query.like(column, value);
            break;
          case 'ilike':
            query = query.ilike(column, value);
            break;
          default:
            query = query.eq(column, value);
        }
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      return query;
    };
    
    // Kontrollera om vi har haft för många misslyckanden med direktmetoden
    const tooManyDirectFailures = this.connectionStatus.attemptCount.direct >= 3 && 
                                 !this.connectionStatus.directWorks;
                                 
    // Om vi haft för många misslyckanden, hoppa direkt till proxy
    if (tooManyDirectFailures) {
      console.log(`[SmartSupabaseClient] Hoppar över direktanslutning p.g.a. för många misslyckanden (${this.connectionStatus.attemptCount.direct})`);
    }
    
    // Försök med direktanslutning först om det har fungerat tidigare och vi inte har för många misslyckanden
    if (this.directClient && this.connectionStatus.directWorks && !tooManyDirectFailures) {
      try {
        console.log(`[SmartSupabaseClient] Använder direktanslutning för ${table}`);
        this.connectionStatus.attemptCount.direct++;
        
        const directQuery = buildDirectQuery();
        
        // Använd single() om det efterfrågas
        const { data, error } = options.single 
          ? await directQuery.single()
          : await directQuery;
        
        if (!error) {
          // Uppdatera status att direktanslutning fungerar
          this.connectionStatus.directWorks = true;
          this.connectionStatus.lastChecked = new Date();
          this.connectionStatus.lastError.direct = null;
          this.connectionStatus.attemptCount.direct = 0; // Återställ räknaren
          return { data, error: null, source: 'direct' };
        }
        
        // Om det är ett SSL-/anslutningsproblem, markera direktanslutning som trasig
        if (error.message && (
            error.message.includes('SSL') || 
            error.message.includes('526') || 
            error.message.includes('failed') ||
            error.message.includes('timeout') ||
            error.message.includes('certificate') ||
            error.message.includes('cloudflare')
          )) {
          console.warn(`[SmartSupabaseClient] Direktanslutning misslyckades med SSL/anslutningsproblem: ${error.message}`);
          this.connectionStatus.directWorks = false;
          this.connectionStatus.lastError.direct = error.message;
          this.connectionStatus.lastError.timestamp = new Date();
        }
        
        // Fallback till proxy om direktanslutningen ger ett fel
        throw new Error(`Direktanslutning misslyckades: ${error.message}`);
      } catch (err) {
        console.log(`[SmartSupabaseClient] Direktanslutning misslyckades, försöker med proxy: ${err.message}`);
        // Fortsätt till proxy
      }
    }
    
    // Kontrollera om vi har haft för många misslyckanden med proxy-metoden
    const tooManyProxyFailures = this.connectionStatus.attemptCount.proxy >= 3 && 
                                !this.connectionStatus.proxyWorks;
                                
    // Om både direkt och proxy har misslyckats för många gånger, returnera ett detaljerat fel
    if (tooManyDirectFailures && tooManyProxyFailures) {
      return {
        data: null,
        error: {
          message: 'Alla anslutningsmetoder misslyckades flera gånger',
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            directAttempts: this.connectionStatus.attemptCount.direct,
            proxyAttempts: this.connectionStatus.attemptCount.proxy,
            lastChecked: this.connectionStatus.lastChecked,
            lastErrorTime: this.connectionStatus.lastError.timestamp
          },
          suggestion: 'Kontrollera Supabase-projektets status i Supabase Dashboard och verifiera att SSL-certifikatet är giltigt.',
          troubleshooting: 'Om problemet består, försök med att skapa ett nytt Supabase-projekt eller kontakta Supabase-support för hjälp med SSL-certifikatet.'
        },
        source: 'error'
      };
    }
    
    // Använd proxy-anslutning som fallback
    try {
      console.log(`[SmartSupabaseClient] Använder proxy-anslutning för ${table}`);
      this.connectionStatus.attemptCount.proxy++;
      
      const { data, error } = await this.proxyClient.select<T>(table, options);
      
      if (error) {
        // Om proxyn också misslyckas, markera den som trasig
        this.connectionStatus.proxyWorks = false;
        this.connectionStatus.lastError.proxy = typeof error === 'string' ? error : error.message || JSON.stringify(error);
        this.connectionStatus.lastError.timestamp = new Date();
        return { data: null, error, source: 'proxy' };
      }
      
      // Uppdatera status att proxy fungerar
      this.connectionStatus.proxyWorks = true;
      this.connectionStatus.lastChecked = new Date();
      this.connectionStatus.lastError.proxy = null;
      this.connectionStatus.attemptCount.proxy = 0; // Återställ räknaren
      return { data, error: null, source: 'proxy' };
    } catch (err) {
      this.connectionStatus.lastError.proxy = err.message;
      this.connectionStatus.lastError.timestamp = new Date();
      
      return { 
        data: null, 
        error: {
          message: `Både direkt- och proxy-anslutningar misslyckades: ${err.message}`,
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            troubleshooting: 'Detta kan bero på ett SSL-valideringsfel från Cloudflare (Error 526) eller ett annat nätverksproblem.'
          },
          original: err
        },
        source: 'error'
      };
    }
  }
  
  /**
   * Lägg till data i en tabell med automatisk felhantering 
   */
  async insert<T = any>(
    table: string,
    records: any | any[]
  ): Promise<{ data: T | null; error: any | null; source: string }> {
    // Kontrollera om vi har haft för många misslyckanden med direktmetoden
    const tooManyDirectFailures = this.connectionStatus.attemptCount.direct >= 3 && 
                                 !this.connectionStatus.directWorks;
                               
    // Om vi haft för många misslyckanden, hoppa direkt till proxy
    if (tooManyDirectFailures) {
      console.log(`[SmartSupabaseClient] Hoppar över direktanslutning p.g.a. för många misslyckanden (${this.connectionStatus.attemptCount.direct})`);
    }
    
    // Försök med direktanslutning först om det har fungerat tidigare och vi inte har för många misslyckanden
    if (this.directClient && this.connectionStatus.directWorks && !tooManyDirectFailures) {
      try {
        console.log(`[SmartSupabaseClient] Använder direktanslutning för insert i ${table}`);
        this.connectionStatus.attemptCount.direct++;
        
        const { data, error } = await this.directClient
          .from(table)
          .insert(records);
        
        if (!error) {
          this.connectionStatus.directWorks = true;
          this.connectionStatus.lastChecked = new Date();
          this.connectionStatus.lastError.direct = null;
          this.connectionStatus.attemptCount.direct = 0; // Återställ räknaren
          return { data, error: null, source: 'direct' };
        }
        
        // Om det är ett SSL-/anslutningsproblem, markera direktanslutning som trasig
        if (error.message && (
            error.message.includes('SSL') || 
            error.message.includes('526') || 
            error.message.includes('failed') ||
            error.message.includes('timeout') ||
            error.message.includes('certificate') ||
            error.message.includes('cloudflare')
          )) {
          console.warn(`[SmartSupabaseClient] Direktanslutning misslyckades med SSL/anslutningsproblem: ${error.message}`);
          this.connectionStatus.directWorks = false;
          this.connectionStatus.lastError.direct = error.message;
          this.connectionStatus.lastError.timestamp = new Date();
        }
        
        throw new Error(`Direktanslutning misslyckades: ${error.message}`);
      } catch (err) {
        console.log(`[SmartSupabaseClient] Direktanslutning misslyckades, försöker med proxy: ${err.message}`);
        // Fortsätt till proxy
      }
    }
    
    // Kontrollera om vi har haft för många misslyckanden med proxy-metoden
    const tooManyProxyFailures = this.connectionStatus.attemptCount.proxy >= 3 && 
                                !this.connectionStatus.proxyWorks;
                                
    // Om både direkt och proxy har misslyckats för många gånger, returnera ett detaljerat fel
    if (tooManyDirectFailures && tooManyProxyFailures) {
      return {
        data: null,
        error: {
          message: 'Alla anslutningsmetoder misslyckades flera gånger',
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            directAttempts: this.connectionStatus.attemptCount.direct,
            proxyAttempts: this.connectionStatus.attemptCount.proxy,
            lastChecked: this.connectionStatus.lastChecked,
            lastErrorTime: this.connectionStatus.lastError.timestamp
          },
          suggestion: 'Kontrollera Supabase-projektets status i Supabase Dashboard och verifiera att SSL-certifikatet är giltigt.'
        },
        source: 'error'
      };
    }
    
    // Använd proxy-anslutning som fallback
    try {
      console.log(`[SmartSupabaseClient] Använder proxy-anslutning för insert i ${table}`);
      this.connectionStatus.attemptCount.proxy++;
      
      const { data, error } = await this.proxyClient.insert<T>(table, records);
      
      if (error) {
        this.connectionStatus.proxyWorks = false;
        this.connectionStatus.lastError.proxy = typeof error === 'string' ? error : error.message || JSON.stringify(error);
        this.connectionStatus.lastError.timestamp = new Date();
        return { data: null, error, source: 'proxy' };
      }
      
      this.connectionStatus.proxyWorks = true;
      this.connectionStatus.lastChecked = new Date();
      this.connectionStatus.lastError.proxy = null;
      this.connectionStatus.attemptCount.proxy = 0; // Återställ räknaren
      return { data, error: null, source: 'proxy' };
    } catch (err) {
      this.connectionStatus.lastError.proxy = err.message;
      this.connectionStatus.lastError.timestamp = new Date();
      
      return { 
        data: null, 
        error: {
          message: `Både direkt- och proxy-anslutningar misslyckades: ${err.message}`,
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            troubleshooting: 'Detta kan bero på ett SSL-valideringsfel från Cloudflare (Error 526) eller ett annat nätverksproblem.'
          },
          original: err
        },
        source: 'error'
      };
    }
  }
  
  /**
   * Uppdatera data i en tabell med automatisk felhantering
   */
  async update<T = any>(
    table: string,
    updates: any,
    match: any
  ): Promise<{ data: T | null; error: any | null; source: string }> {
    // Kontrollera om vi har haft för många misslyckanden med direktmetoden
    const tooManyDirectFailures = this.connectionStatus.attemptCount.direct >= 3 && 
                                 !this.connectionStatus.directWorks;
                               
    // Om vi haft för många misslyckanden, hoppa direkt till proxy
    if (tooManyDirectFailures) {
      console.log(`[SmartSupabaseClient] Hoppar över direktanslutning p.g.a. för många misslyckanden (${this.connectionStatus.attemptCount.direct})`);
    }
    
    // Försök med direktanslutning först om det har fungerat tidigare och vi inte har för många misslyckanden
    if (this.directClient && this.connectionStatus.directWorks && !tooManyDirectFailures) {
      try {
        console.log(`[SmartSupabaseClient] Använder direktanslutning för update i ${table}`);
        this.connectionStatus.attemptCount.direct++;
        
        const { data, error } = await this.directClient
          .from(table)
          .update(updates)
          .match(match);
        
        if (!error) {
          this.connectionStatus.directWorks = true;
          this.connectionStatus.lastChecked = new Date();
          this.connectionStatus.lastError.direct = null;
          this.connectionStatus.attemptCount.direct = 0; // Återställ räknaren
          return { data, error: null, source: 'direct' };
        }
        
        // Om det är ett SSL-/anslutningsproblem, markera direktanslutning som trasig
        if (error.message && (
            error.message.includes('SSL') || 
            error.message.includes('526') || 
            error.message.includes('failed') ||
            error.message.includes('timeout') ||
            error.message.includes('certificate') ||
            error.message.includes('cloudflare')
          )) {
          console.warn(`[SmartSupabaseClient] Direktanslutning misslyckades med SSL/anslutningsproblem: ${error.message}`);
          this.connectionStatus.directWorks = false;
          this.connectionStatus.lastError.direct = error.message;
          this.connectionStatus.lastError.timestamp = new Date();
        }
        
        throw new Error(`Direktanslutning misslyckades: ${error.message}`);
      } catch (err) {
        console.log(`[SmartSupabaseClient] Direktanslutning misslyckades, försöker med proxy: ${err.message}`);
        // Fortsätt till proxy
      }
    }
    
    // Kontrollera om vi har haft för många misslyckanden med proxy-metoden
    const tooManyProxyFailures = this.connectionStatus.attemptCount.proxy >= 3 && 
                                !this.connectionStatus.proxyWorks;
                                
    // Om både direkt och proxy har misslyckats för många gånger, returnera ett detaljerat fel
    if (tooManyDirectFailures && tooManyProxyFailures) {
      return {
        data: null,
        error: {
          message: 'Alla anslutningsmetoder misslyckades flera gånger',
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            directAttempts: this.connectionStatus.attemptCount.direct,
            proxyAttempts: this.connectionStatus.attemptCount.proxy,
            lastChecked: this.connectionStatus.lastChecked,
            lastErrorTime: this.connectionStatus.lastError.timestamp
          },
          suggestion: 'Kontrollera Supabase-projektets status i Supabase Dashboard och verifiera att SSL-certifikatet är giltigt.'
        },
        source: 'error'
      };
    }
    
    // Använd proxy-anslutning som fallback
    try {
      console.log(`[SmartSupabaseClient] Använder proxy-anslutning för update i ${table}`);
      this.connectionStatus.attemptCount.proxy++;
      
      const { data, error } = await this.proxyClient.update<T>(table, updates, match);
      
      if (error) {
        this.connectionStatus.proxyWorks = false;
        this.connectionStatus.lastError.proxy = typeof error === 'string' ? error : error.message || JSON.stringify(error);
        this.connectionStatus.lastError.timestamp = new Date();
        return { data: null, error, source: 'proxy' };
      }
      
      this.connectionStatus.proxyWorks = true;
      this.connectionStatus.lastChecked = new Date();
      this.connectionStatus.lastError.proxy = null;
      this.connectionStatus.attemptCount.proxy = 0; // Återställ räknaren
      return { data, error: null, source: 'proxy' };
    } catch (err) {
      this.connectionStatus.lastError.proxy = err.message;
      this.connectionStatus.lastError.timestamp = new Date();
      
      return { 
        data: null, 
        error: {
          message: `Både direkt- och proxy-anslutningar misslyckades: ${err.message}`,
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            troubleshooting: 'Detta kan bero på ett SSL-valideringsfel från Cloudflare (Error 526) eller ett annat nätverksproblem.'
          },
          original: err
        },
        source: 'error'
      };
    }
  }
  
  /**
   * Ta bort data från en tabell med automatisk felhantering
   */
  async delete<T = any>(
    table: string,
    match: any
  ): Promise<{ data: T | null; error: any | null; source: string }> {
    // Kontrollera om vi har haft för många misslyckanden med direktmetoden
    const tooManyDirectFailures = this.connectionStatus.attemptCount.direct >= 3 && 
                                 !this.connectionStatus.directWorks;
                               
    // Om vi haft för många misslyckanden, hoppa direkt till proxy
    if (tooManyDirectFailures) {
      console.log(`[SmartSupabaseClient] Hoppar över direktanslutning p.g.a. för många misslyckanden (${this.connectionStatus.attemptCount.direct})`);
    }
    
    // Försök med direktanslutning först om det har fungerat tidigare och vi inte har för många misslyckanden
    if (this.directClient && this.connectionStatus.directWorks && !tooManyDirectFailures) {
      try {
        console.log(`[SmartSupabaseClient] Använder direktanslutning för delete i ${table}`);
        this.connectionStatus.attemptCount.direct++;
        
        const { data, error } = await this.directClient
          .from(table)
          .delete()
          .match(match);
        
        if (!error) {
          this.connectionStatus.directWorks = true;
          this.connectionStatus.lastChecked = new Date();
          this.connectionStatus.lastError.direct = null;
          this.connectionStatus.attemptCount.direct = 0; // Återställ räknaren
          return { data, error: null, source: 'direct' };
        }
        
        // Om det är ett SSL-/anslutningsproblem, markera direktanslutning som trasig
        if (error.message && (
            error.message.includes('SSL') || 
            error.message.includes('526') || 
            error.message.includes('failed') ||
            error.message.includes('timeout') ||
            error.message.includes('certificate') ||
            error.message.includes('cloudflare')
          )) {
          console.warn(`[SmartSupabaseClient] Direktanslutning misslyckades med SSL/anslutningsproblem: ${error.message}`);
          this.connectionStatus.directWorks = false;
          this.connectionStatus.lastError.direct = error.message;
          this.connectionStatus.lastError.timestamp = new Date();
        }
        
        throw new Error(`Direktanslutning misslyckades: ${error.message}`);
      } catch (err) {
        console.log(`[SmartSupabaseClient] Direktanslutning misslyckades, försöker med proxy: ${err.message}`);
        // Fortsätt till proxy
      }
    }
    
    // Kontrollera om vi har haft för många misslyckanden med proxy-metoden
    const tooManyProxyFailures = this.connectionStatus.attemptCount.proxy >= 3 && 
                                !this.connectionStatus.proxyWorks;
                                
    // Om både direkt och proxy har misslyckats för många gånger, returnera ett detaljerat fel
    if (tooManyDirectFailures && tooManyProxyFailures) {
      return {
        data: null,
        error: {
          message: 'Alla anslutningsmetoder misslyckades flera gånger',
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            directAttempts: this.connectionStatus.attemptCount.direct,
            proxyAttempts: this.connectionStatus.attemptCount.proxy,
            lastChecked: this.connectionStatus.lastChecked,
            lastErrorTime: this.connectionStatus.lastError.timestamp
          },
          suggestion: 'Kontrollera Supabase-projektets status i Supabase Dashboard och verifiera att SSL-certifikatet är giltigt.'
        },
        source: 'error'
      };
    }
    
    // Använd proxy-anslutning som fallback
    try {
      console.log(`[SmartSupabaseClient] Använder proxy-anslutning för delete i ${table}`);
      this.connectionStatus.attemptCount.proxy++;
      
      const { data, error } = await this.proxyClient.delete<T>(table, match);
      
      if (error) {
        this.connectionStatus.proxyWorks = false;
        this.connectionStatus.lastError.proxy = typeof error === 'string' ? error : error.message || JSON.stringify(error);
        this.connectionStatus.lastError.timestamp = new Date();
        return { data: null, error, source: 'proxy' };
      }
      
      this.connectionStatus.proxyWorks = true;
      this.connectionStatus.lastChecked = new Date();
      this.connectionStatus.lastError.proxy = null;
      this.connectionStatus.attemptCount.proxy = 0; // Återställ räknaren
      return { data, error: null, source: 'proxy' };
    } catch (err) {
      this.connectionStatus.lastError.proxy = err.message;
      this.connectionStatus.lastError.timestamp = new Date();
      
      return { 
        data: null, 
        error: {
          message: `Både direkt- och proxy-anslutningar misslyckades: ${err.message}`,
          details: {
            directError: this.connectionStatus.lastError.direct,
            proxyError: this.connectionStatus.lastError.proxy,
            troubleshooting: 'Detta kan bero på ett SSL-valideringsfel från Cloudflare (Error 526) eller ett annat nätverksproblem.'
          },
          original: err
        },
        source: 'error'
      };
    }
  }
  
  /**
   * Testar vilken anslutningsmetod som fungerar bäst
   */
  async testConnections() {
    const results = {
      direct: { success: false, timing: 0, error: null },
      proxy: { success: false, timing: 0, error: null },
      cloudflareIssue: false
    };
    
    // Testa direktanslutning
    if (this.directClient) {
      try {
        const startTime = Date.now();
        const { data, error } = await this.directClient
          .from('handbooks')
          .select('id')
          .limit(1);
        
        const endTime = Date.now();
        
        results.direct = {
          success: !error,
          timing: endTime - startTime,
          error: error ? error.message : null
        };
        
        this.connectionStatus.directWorks = !error;
      } catch (err) {
        results.direct = {
          success: false,
          timing: 0,
          error: err.message
        };
        
        this.connectionStatus.directWorks = false;
      }
    }
    
    // Testa proxyanslutning
    try {
      const startTime = Date.now();
      const { data, error } = await this.proxyClient.select('handbooks', { limit: 1 });
      const endTime = Date.now();
      
      results.proxy = {
        success: !error,
        timing: endTime - startTime,
        error: error ? error.message : null
      };
      
      this.connectionStatus.proxyWorks = !error;
    } catch (err) {
      results.proxy = {
        success: false,
        timing: 0,
        error: err.message
      };
      
      this.connectionStatus.proxyWorks = false;
    }
    
    this.connectionStatus.lastChecked = new Date();
    
    // Kontrollera om det finns Cloudflare-problem
    if (results.direct.error || results.proxy.error) {
      results.cloudflareIssue = true;
    }
    
    return {
      ...results,
      recommended: results.direct.success ? 'direct' : results.proxy.success ? 'proxy' : 'none',
      both_working: results.direct.success && results.proxy.success,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Diagnosfunktion för att testa alla anslutningsmetoder och returnera detaljerad information
   */
  async diagnose() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        isEdgeRuntime: typeof EdgeRuntime !== 'undefined',
        isServer: typeof window === 'undefined',
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 12) + '...' : 
          'missing'
      },
      connectionStatus: { ...this.connectionStatus },
      results: {
        direct: null,
        proxy: null
      },
      cloudflareCheck: await this.checkCloudflareStatus(),
      recommendations: []
    };
    
    // Testa direktanslutning
    const directResult = await this.testDirectConnection();
    diagnostics.results.direct = directResult;
    
    // Testa proxyanslutning
    const proxyResult = await this.testProxyConnection();
    diagnostics.results.proxy = proxyResult;
    
    // Uppdatera status baserat på testresultat
    this.connectionStatus.directWorks = directResult.success;
    this.connectionStatus.proxyWorks = proxyResult.success;
    
    // Generera rekommendationer
    if (directResult.success) {
      diagnostics.recommendations.push('Direktanslutning fungerar och bör användas för bästa prestanda.');
    } else if (proxyResult.success) {
      diagnostics.recommendations.push('Använd proxy-anslutning eftersom direktanslutningen misslyckas.');
    } else {
      diagnostics.recommendations.push('Varken direkt eller proxy-anslutning fungerar. Kontrollera Supabase-projektets status och din nätverksanslutning.');
    }
    
    if (diagnostics.cloudflareCheck.isCloudflareError) {
      diagnostics.recommendations.push('Ett Cloudflare SSL-valideringsfel (Error 526) har upptäckts. Detta beror troligen på ett problem med SSL-certifikatet i ditt Supabase-projekt. Kontrollera att projektet är aktivt och inte pausat.');
    }
    
    return diagnostics;
  }
  
  /**
   * Kontrollera om det finns Cloudflare-relaterade problem
   */
  private async checkCloudflareStatus() {
    try {
      // Testa att göra en enkel förfrågan mot Supabase URL för att se om vi får Cloudflare-relaterade fel
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      if (!supabaseUrl) {
        return {
          isCloudflareError: false,
          error: 'Saknar Supabase URL',
          details: null
        };
      }
      
      const response = await fetch(supabaseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      // Cloudflare-relaterade felkoder
      const cloudflareErrorCodes = [526, 525, 522];
      
      if (!response.ok && cloudflareErrorCodes.includes(response.status)) {
        return {
          isCloudflareError: true,
          statusCode: response.status,
          statusText: response.statusText,
          details: 'Detta indikerar ett SSL-valideringsfel från Cloudflare (Error 526) vilket innebär att SSL-certifikatet på din Supabase-instans inte kunde valideras.'
        };
      }
      
      return {
        isCloudflareError: false,
        statusCode: response.status,
        statusText: response.statusText,
        details: null
      };
    } catch (error) {
      return {
        isCloudflareError: error.message?.includes('526') || error.message?.includes('SSL'),
        error: error.message,
        details: error.cause ? String(error.cause) : null
      };
    }
  }
  
  /**
   * Testar direktanslutning till Supabase
   */
  private async testDirectConnection() {
    try {
      console.log('[SmartSupabaseClient] Testar direktanslutning...');
      
      if (!this.directClient) {
        console.warn('[SmartSupabaseClient] Ingen direktklient tillgänglig');
        return {
          success: false,
          error: 'Ingen direktklient tillgänglig',
          cloudflareError: false
        };
      }
      
      const startTime = Date.now();
      
      // Först gör vi en enkel förfrågan för att aktivera eventuella headers
      try {
        await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL || '', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        });
      } catch (pingError) {
        // Om detta är ett Cloudflare-fel noterar vi det, men fortsätter med testen
        if (pingError.message?.includes('526') || 
            pingError.message?.includes('SSL') || 
            pingError.message?.includes('certificate')) {
          console.warn('[SmartSupabaseClient] Cloudflare SSL-fel vid ping:', pingError.message);
        }
      }
      
      // Nu gör vi det faktiska testet mot PostgrestClient
      const { data, error } = await this.directClient
        .from('handbooks')
        .select('count')
        .limit(1);
      
      const endTime = Date.now();
      
      if (error) {
        // Specifik hantering för Cloudflare-fel
        const isCloudflareError = 
          error.message?.includes('526') || 
          error.message?.includes('SSL') || 
          error.message?.includes('certificate') ||
          error.code === 'ECONNRESET';
        
        if (isCloudflareError) {
          console.warn('[SmartSupabaseClient] Cloudflare SSL-fel vid direktanslutning:', error.message);
          this.connectionStatus.cloudflareIssueDetected = true;
        }
        
        return { 
          success: false, 
          error: error.message, 
          timing: endTime - startTime,
          cloudflareError: isCloudflareError
        };
      }
      
      return { 
        success: true, 
        data, 
        timing: endTime - startTime,
        cloudflareError: false
      };
    } catch (error) {
      // Kontrollera om det är ett Cloudflare-fel
      const isCloudflareError = 
        error.message?.includes('526') || 
        error.message?.includes('SSL') || 
        error.message?.includes('certificate') ||
        error.code === 'ECONNRESET';
      
      if (isCloudflareError) {
        this.connectionStatus.cloudflareIssueDetected = true;
      }
      
      return { 
        success: false, 
        error: error.message,
        cloudflareError: isCloudflareError
      };
    }
  }
  
  /**
   * Testar proxyanslutning till Supabase
   */
  private async testProxyConnection() {
    try {
      const startTime = Date.now();
      const { data, error } = await this.proxyClient.select('handbooks', {
        limit: 1,
        columns: 'count'
      });
      
      const endTime = Date.now();
      
      if (error) {
        return { 
          connected: false, 
          error: typeof error === 'string' ? error : error.message || JSON.stringify(error), 
          details: error.details || null,
          method: 'proxy',
          timing: endTime - startTime
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
}

/**
 * Singleton-instans av SmartSupabaseClient
 */
let smartClientInstance: SmartSupabaseClient | null = null;

/**
 * Hämta eller skapa en SmartSupabaseClient-instans
 */
export function getSmartClient(): SmartSupabaseClient {
  if (!smartClientInstance) {
    smartClientInstance = new SmartSupabaseClient();
    console.log('Skapade ny SmartSupabaseClient-instans');
  }
  
  return smartClientInstance;
} 