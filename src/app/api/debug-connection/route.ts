import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, testDatabaseConnection } from '@/lib/supabase';

export const runtime = 'edge';
export const preferredRegion = ['arn1'];

// Testar nätverksanslutningen direkt
async function testNetworkConnection(url: string) {
  try {
    console.log(`Testar nätverksanslutning till: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    const endTime = Date.now();
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      timing: endTime - startTime,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorName: error.name,
      errorCause: error.cause ? String(error.cause) : null,
    };
  }
}

// Testar DNS-uppslagning (så gott det går i Edge-runtime)
async function testDns(host: string) {
  try {
    const url = `https://${host}`;
    console.log(`Testar DNS för: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const startTime = Date.now();
    await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const endTime = Date.now();
    
    return {
      resolvable: true,
      timing: endTime - startTime,
    };
  } catch (error) {
    // Om det är en abort, var det timeout
    if (error.name === 'AbortError') {
      return {
        resolvable: false,
        error: 'Timeout vid DNS-uppslagning',
      };
    }
    
    // Om det är ett nätverksfel som inte är timeout, var domänen förmodligen upplöst
    if (error.message && !error.message.includes('getaddrinfo')) {
      return {
        resolvable: true,
        error: error.message,
      };
    }
    
    return {
      resolvable: false,
      error: error.message,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('Startar debug-connection:', new Date().toISOString());
    
    // Basinformation om miljön
    const nodeEnv = process.env.NODE_ENV;
    const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';
    const vercelUrl = process.env.VERCEL_URL;
    const vercelEnv = process.env.VERCEL_ENV;
    const host = request.headers.get('host');
    
    // Hämta informationen om Supabase-konfigurationen (utan känsliga detaljer)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Miljöinformation insamlad');
    
    // Testa nätverksanslutning till Supabase
    console.log('Testar nätverksanslutning till Supabase...');
    let dbHost = '';
    if (supabaseUrl) {
      const url = new URL(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`);
      dbHost = url.hostname;
    }
    
    let networkTest = null;
    let dnsTest = null;
    
    if (dbHost) {
      // Testa DNS först
      dnsTest = await testDns(dbHost);
      console.log('DNS-test resultat:', dnsTest);
      
      // Testa sedan nätverksanslutning om DNS fungerar
      if (dnsTest.resolvable) {
        networkTest = await testNetworkConnection(`https://${dbHost}/rest/v1/`);
        console.log('Nätverkstest resultat:', networkTest);
      }
    }
    
    // Testa databasanslutning
    console.log('Testar databasanslutning...');
    const dbConnection = await testDatabaseConnection();
    console.log('Databasanslutning resultat:', dbConnection);
    
    const endTime = Date.now();
    
    // Sammanställ diagnostisk information
    const diagnostics = {
      timestamp: new Date().toISOString(),
      testDuration: endTime - startTime,
      environment: {
        nodeEnv,
        isEdgeRuntime,
        vercelUrl,
        vercelEnv,
        host,
      },
      supabaseConfig: {
        url: supabaseUrl ? (supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`) : null,
        hasAnonKey,
        hasServiceRoleKey,
        dbHost,
      },
      tests: {
        dns: dnsTest,
        network: networkTest,
        database: dbConnection,
      },
    };
    
    console.log('Debug slutförd');
    
    // Returnera alla diagnostikdata
    return NextResponse.json(diagnostics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Fel i debug-rutten:', error);
    
    return NextResponse.json({
      error: 'Ett fel uppstod vid diagnostik',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
} 