import { useState, useEffect, useCallback } from 'react';
import { getSmartClient } from '../smart-supabase-client';
import type { SmartSupabaseClient } from '../smart-supabase-client';

// Typ för statusinformation
type ConnectionStatus = {
  isConnected: boolean;
  isLoading: boolean;
  lastError: string | null;
  connectionMethod: 'direct' | 'proxy' | 'unknown';
  lastUpdated: Date;
  cloudflareIssueDetected: boolean;
};

/**
 * React hook för att använda SmartSupabaseClient med statushantering
 */
export function useSmartSupabase() {
  const [client] = useState<SmartSupabaseClient>(() => getSmartClient());
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isLoading: true,
    lastError: null,
    connectionMethod: 'unknown',
    lastUpdated: new Date(),
    cloudflareIssueDetected: false
  });

  // Diagnostik-funktion
  const runDiagnostics = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      // Kör diagnostik via klienten
      const diagnostics = await client.diagnose();
      
      // Uppdatera status baserat på diagnostiken
      setStatus({
        isConnected: diagnostics.results.direct.success || diagnostics.results.proxy.success,
        isLoading: false,
        lastError: diagnostics.results.direct.success 
          ? null 
          : diagnostics.results.proxy.success 
            ? null 
            : diagnostics.results.direct.error || diagnostics.results.proxy.error || null,
        connectionMethod: diagnostics.results.direct.success 
          ? 'direct' 
          : diagnostics.results.proxy.success 
            ? 'proxy' 
            : 'unknown',
        lastUpdated: new Date(),
        cloudflareIssueDetected: diagnostics.cloudflareCheck?.isCloudflareError || false
      });
      
      return diagnostics;
    } catch (err) {
      // Hantera fel vid diagnostik
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false, 
        isConnected: false, 
        lastError: err.message || 'Kunde inte köra diagnostik' 
      }));
      return null;
    }
  }, [client]);
  
  // Kör en diagnostik automatiskt när klienten skapas
  useEffect(() => {
    runDiagnostics();
    
    // Automatisk hälsokontroll var 5:e minut
    const intervalId = setInterval(() => {
      // Bara kör om klienten inte är i användning eller varit offline
      if (!status.isConnected || status.lastError) {
        runDiagnostics();
      }
    }, 5 * 60 * 1000); // 5 minuter
    
    return () => clearInterval(intervalId);
  }, [runDiagnostics, status.isConnected, status.lastError]);
  
  /**
   * Generisk select-funktion med felhantering och statusuppdatering
   */
  const select = useCallback(async <T = any>(
    table: string,
    options: {
      columns?: string;
      filter?: { column: string; operator: string; value: any };
      limit?: number;
      single?: boolean;
    } = {}
  ): Promise<{ data: T | null; error: any | null }> => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      const result = await client.select<T>(table, options);
      
      if (result.error) {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: typeof result.error === 'string' ? result.error : result.error.message || 'Ett fel inträffade',
          isConnected: false,
          lastUpdated: new Date()
        }));
      } else {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: null,
          isConnected: true,
          connectionMethod: result.source === 'direct' ? 'direct' : result.source === 'proxy' ? 'proxy' : prev.connectionMethod,
          lastUpdated: new Date()
        }));
      }
      
      return result;
    } catch (err) {
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false,
        lastError: err.message || 'Ett okänt fel inträffade',
        isConnected: false,
        lastUpdated: new Date()
      }));
      
      return { data: null, error: err };
    }
  }, [client]);
  
  /**
   * Generisk insert-funktion med felhantering och statusuppdatering
   */
  const insert = useCallback(async <T = any>(
    table: string,
    records: any | any[]
  ): Promise<{ data: T | null; error: any | null }> => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      const result = await client.insert<T>(table, records);
      
      if (result.error) {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: typeof result.error === 'string' ? result.error : result.error.message || 'Ett fel inträffade',
          lastUpdated: new Date()
        }));
      } else {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: null,
          isConnected: true,
          connectionMethod: result.source === 'direct' ? 'direct' : result.source === 'proxy' ? 'proxy' : prev.connectionMethod,
          lastUpdated: new Date()
        }));
      }
      
      return result;
    } catch (err) {
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false,
        lastError: err.message || 'Ett okänt fel inträffade',
        lastUpdated: new Date()
      }));
      
      return { data: null, error: err };
    }
  }, [client]);
  
  /**
   * Generisk update-funktion med felhantering och statusuppdatering
   */
  const update = useCallback(async <T = any>(
    table: string,
    updates: any,
    match: any
  ): Promise<{ data: T | null; error: any | null }> => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      const result = await client.update<T>(table, updates, match);
      
      if (result.error) {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: typeof result.error === 'string' ? result.error : result.error.message || 'Ett fel inträffade',
          lastUpdated: new Date()
        }));
      } else {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: null,
          isConnected: true,
          connectionMethod: result.source === 'direct' ? 'direct' : result.source === 'proxy' ? 'proxy' : prev.connectionMethod,
          lastUpdated: new Date()
        }));
      }
      
      return result;
    } catch (err) {
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false,
        lastError: err.message || 'Ett okänt fel inträffade',
        lastUpdated: new Date()
      }));
      
      return { data: null, error: err };
    }
  }, [client]);
  
  /**
   * Generisk delete-funktion med felhantering och statusuppdatering
   */
  const delete_ = useCallback(async <T = any>(
    table: string,
    match: any
  ): Promise<{ data: T | null; error: any | null }> => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      const result = await client.delete<T>(table, match);
      
      if (result.error) {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: typeof result.error === 'string' ? result.error : result.error.message || 'Ett fel inträffade',
          lastUpdated: new Date()
        }));
      } else {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          lastError: null,
          isConnected: true,
          connectionMethod: result.source === 'direct' ? 'direct' : result.source === 'proxy' ? 'proxy' : prev.connectionMethod,
          lastUpdated: new Date()
        }));
      }
      
      return result;
    } catch (err) {
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false,
        lastError: err.message || 'Ett okänt fel inträffade',
        lastUpdated: new Date()
      }));
      
      return { data: null, error: err };
    }
  }, [client]);
  
  return {
    client,
    status,
    runDiagnostics,
    select,
    insert,
    update,
    delete: delete_
  };
} 