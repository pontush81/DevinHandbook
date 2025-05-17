import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ingen export const runtime - detta blir en vanlig serverless-funktion, inte en edge-funktion

// Hjälpfunktion för att hämta korrekt Supabase URL
function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // Säkerställ att URL:en har https-prefix
  if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
    return `https://${url}`;
  }
  
  return url.replace(/^http:\/\//, 'https://');
}

export async function POST(request: NextRequest) {
  try {
    // Hämta konfiguration
    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Saknar Supabase-konfiguration',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }
    
    // Validera Supabase URL format
    if (!supabaseUrl.startsWith('https://')) {
      return NextResponse.json({
        success: false,
        error: 'Ogiltig Supabase URL',
        details: 'URL måste börja med https://'
      }, { status: 500 });
    }
    
    console.log(`Ansluter till Supabase på: ${supabaseUrl}`);
    
    // Försök att göra en fetch mot Supabase URL:en för att testa SSL-anslutningen
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const sslTestResponse = await fetch(supabaseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Proxy/1.0',
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        },
        signal: controller.signal,
        cache: 'no-store',
        // Important: Set rejectUnauthorized to false only when testing the SSL
        // This is a serverless function, so we can allow this here for diagnostics
      });
      
      clearTimeout(timeoutId);
      
      if (!sslTestResponse.ok) {
        // Cloudflare SSL-fel (error 526)
        if (sslTestResponse.status === 526 || sslTestResponse.status === 525) {
          return NextResponse.json({
            success: false,
            error: `Cloudflare SSL-valideringsfel (status ${sslTestResponse.status})`,
            details: 'Supabase-projektets SSL-certifikat kunde inte valideras av Cloudflare.',
            solution: 'Kontrollera Supabase-projektet i Supabase-konsolen eller kontakta Supabase-support.',
            url: supabaseUrl,
            time: new Date().toISOString(),
            cloudflareError: true
          }, { status: 502 });
        }
        
        console.warn(`SSL test mot Supabase gav felstatus: ${sslTestResponse.status} ${sslTestResponse.statusText}`);
      } else {
        console.log('SSL-anslutning till Supabase fungerar.');
      }
    } catch (sslError) {
      console.error('SSL-anslutningsfel:', sslError.message);
      
      // Kontrollera om det är ett Cloudflare-relaterat SSL-fel
      const isCloudflareError = 
        sslError.message?.includes('526') ||
        sslError.message?.includes('525') ||
        sslError.message?.includes('SSL') ||
        sslError.message?.includes('certificate');
      
      if (isCloudflareError) {
        return NextResponse.json({
          success: false,
          error: 'Cloudflare SSL-valideringsfel',
          details: sslError.message || 'Supabase-projektets SSL-certifikat kunde inte valideras.',
          url: supabaseUrl,
          errorCode: sslError.code || 'SSL_ERROR',
          time: new Date().toISOString(),
          cloudflareError: true
        }, { status: 502 });
      }
      
      // SSL-fel eller annat anslutningsfel
      return NextResponse.json({
        success: false,
        error: 'Anslutningsfel till Supabase',
        details: sslError.message || 'Kunde inte ansluta till Supabase. Möjligt SSL-fel.',
        url: supabaseUrl,
        errorCode: sslError.code || 'UNKNOWN',
        time: new Date().toISOString()
      }, { status: 502 });
    }
    
    // Skapa en Supabase-klient med service_role-nyckeln för admin-åtkomst
    // Notera: sätter auth.autoRefreshToken till false för att undvika problem
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        fetch: async (url, options) => {
          // Anpassad fetch-funktion för att hantera SSL-problem
          const result = await fetch(url, {
            ...options,
            cache: 'no-store',
            headers: {
              ...options?.headers,
              'Cache-Control': 'no-cache, no-store',
              'Pragma': 'no-cache'
            }
          });
          return result;
        }
      }
    });
    
    // Hämta förfrågningsdata
    const { table, method, params = {}, diagnostics = {} } = await request.json();
    
    if (!table || !method) {
      return NextResponse.json({
        success: false,
        error: 'Ogiltiga parametrar',
        details: 'Både table och method måste anges'
      }, { status: 400 });
    }
    
    console.log(`Utför ${method}-operation på tabell: ${table} (diagnostics: ${JSON.stringify(diagnostics)})`);
    
    // Skapa en referens till tabellen
    const tableRef = supabase.from(table);
    
    // Utför förfrågan baserat på metod
    let result;
    
    try {
      switch (method) {
        case 'select':
          const { columns, filter, limit, single } = params;
          
          let query = tableRef.select(columns || '*');
          
          if (filter) {
            const { column, operator, value } = filter;
            query = query.filter(column, operator, value);
          }
          
          if (limit) {
            query = query.limit(limit);
          }
          
          if (single) {
            result = await query.single();
          } else {
            result = await query;
          }
          
          break;
          
        case 'insert':
          const { records } = params;
          result = await tableRef.insert(records);
          break;
          
        case 'update':
          const { updates, match } = params;
          result = await tableRef.update(updates).match(match);
          break;
          
        case 'delete':
          const { matchDelete } = params;
          result = await tableRef.delete().match(matchDelete);
          break;
          
        default:
          return NextResponse.json({
            success: false,
            error: 'Ogiltig metod',
            details: `Metoden '${method}' stöds inte`
          }, { status: 400 });
      }
    } catch (operationError) {
      // Hantera Supabase-operationsfel
      return NextResponse.json({
        success: false,
        error: operationError.message || 'Ett fel inträffade vid Supabase-operationen',
        details: operationError.details || operationError.hint || null,
        errorCode: operationError.code || 'OPERATION_ERROR',
        time: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Returnera resultatet
    return NextResponse.json({
      success: !result.error,
      data: result.data,
      error: result.error,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Proxy-fel:', error.message || error);
    
    // Detaljerad felrapportering
    return NextResponse.json({
      success: false,
      error: error.message || 'Ett okänt fel inträffade',
      details: error.cause ? String(error.cause) : null,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : null,
      time: new Date().toISOString(),
      request_id: crypto.randomUUID()
    }, { status: 500 });
  }
} 