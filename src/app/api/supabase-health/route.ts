import { NextRequest, NextResponse } from 'next/server';
import { getSmartClient } from '@/lib/smart-supabase-client';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.has('detailed');
    
    console.log(`Running Supabase health check${detailed ? ' (detailed)' : ''}`);
    
    // Skapa SmartClient-instans för att testa anslutningar
    const smartClient = getSmartClient();
    
    // Kör SmartClient-diagnoserna för att testa alla anslutningsmetoder
    const smartDiagnosis = await smartClient.diagnose();
    
    // Hämta huvudtabellerna
    const tables = ['handbooks', 'sections', 'pages', 'documents'];
    const tableStats = {};
    
    // Hämta serverversionen om möjligt
    let serverVersion = null;
    let pgVersion = null;
    
    // Kollar om vi har admin-tillgång och kan köra SQL-frågor
    try {
      const supabaseAdmin = getServiceSupabase();
      
      // Försök hämta Supabase- och Postgres-version
      const { data: versionData, error: versionError } = await supabaseAdmin.rpc('get_service_info');
      
      if (!versionError && versionData) {
        serverVersion = versionData.supabase_version;
        pgVersion = versionData.pg_version;
      } else {
        console.warn('Kunde inte hämta versionsinfo:', versionError);
      }
      
      // Hämta statistik för varje tabell om detaljerad rapport begärts
      if (detailed) {
        for (const table of tables) {
          try {
            // Hämta antal rader i tabellen
            const { data: countData, error: countError } = await supabaseAdmin
              .from(table)
              .select('count');
              
            if (!countError && countData) {
              tableStats[table] = {
                count: countData.length > 0 ? countData[0].count : 0,
                status: 'available'
              };
            } else {
              tableStats[table] = {
                status: 'error',
                error: countError ? countError.message : 'Okänt fel',
                count: null
              };
            }
          } catch (tableError) {
            tableStats[table] = {
              status: 'error',
              error: tableError.message,
              count: null
            };
          }
        }
      }
    } catch (adminError) {
      console.error('Fel vid admin-åtkomst:', adminError);
    }
    
    // Testa Cloudflare SSL-anslutning
    const cloudflareTest = await testCloudflareSSL();
    
    // Sammanställ hälsostatus baserat på testresultat
    const healthStatus = determineOverallHealth(smartDiagnosis, cloudflareTest);
    
    // Skapa sammanställning av hälsostatus
    return NextResponse.json({
      status: healthStatus.status,
      message: healthStatus.message,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        isEdgeRuntime: typeof EdgeRuntime !== 'undefined'
      },
      serverVersion,
      pgVersion,
      connections: {
        direct: smartDiagnosis.tests.direct.connected,
        proxy: smartDiagnosis.tests.proxy.connected,
        cloudflare: !cloudflareTest.hasCloudflareIssue
      },
      recommendations: smartDiagnosis.recommendations,
      issues: healthStatus.issues,
      tables: detailed ? tableStats : undefined,
      bestConnectionMethod: smartDiagnosis.tests.direct.connected ? 'direct' : 
                           smartDiagnosis.tests.proxy.connected ? 'proxy' : 'none'
    }, {
      status: healthStatus.status === 'healthy' ? 200 : 
             healthStatus.status === 'degraded' ? 200 :
             healthStatus.status === 'unhealthy' ? 503 : 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Kunde inte utföra hälsokontroll',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}

// Testa specifikt för Cloudflare SSL-validerings problem
async function testCloudflareSSL() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return {
        hasCloudflareIssue: false,
        error: 'Saknar Supabase URL',
        details: null
      };
    }
    
    // Försök ansluta direkt till Supabase URL
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
        hasCloudflareIssue: true,
        statusCode: response.status,
        statusText: response.statusText,
        details: `SSL-valideringsfel från Cloudflare (Error ${response.status})`
      };
    }
    
    return {
      hasCloudflareIssue: false,
      statusCode: response.status,
      statusText: response.statusText,
      details: null
    };
  } catch (error) {
    const isCloudflareRelated = 
      error.message?.includes('526') || 
      error.message?.includes('525') || 
      error.message?.includes('SSL') || 
      error.message?.includes('certificate');
    
    return {
      hasCloudflareIssue: isCloudflareRelated,
      error: error.message,
      details: error.cause ? String(error.cause) : null
    };
  }
}

// Bestäm övergripande hälsostatus baserat på testresultat
function determineOverallHealth(smartDiagnosis, cloudflareTest) {
  const issues = [];
  
  // Kontrollera för SSL-problem
  if (cloudflareTest.hasCloudflareIssue) {
    issues.push({
      type: 'critical',
      message: 'Cloudflare SSL-valideringsfel (Error 526)',
      details: cloudflareTest.details || 'SSL-certifikatet kunde inte valideras av Cloudflare'
    });
  }
  
  // Kontrollera anslutningsmetoder
  const directConnected = smartDiagnosis.tests.direct.connected;
  const proxyConnected = smartDiagnosis.tests.proxy.connected;
  
  if (!directConnected && !proxyConnected) {
    issues.push({
      type: 'critical',
      message: 'Alla anslutningsmetoder misslyckades',
      details: 'Varken direktanslutning eller proxy-anslutning fungerar'
    });
  } else if (!directConnected) {
    issues.push({
      type: 'warning',
      message: 'Direktanslutning misslyckades',
      details: smartDiagnosis.tests.direct.error || 'Kunde inte ansluta direkt till Supabase'
    });
  } else if (!proxyConnected) {
    issues.push({
      type: 'info',
      message: 'Proxy-anslutning misslyckades',
      details: smartDiagnosis.tests.proxy.error || 'Kunde inte ansluta via proxy, men direktanslutning fungerar'
    });
  }
  
  // Bestäm övergripande status
  let status = 'healthy';
  let message = 'All Supabase connections are working properly';
  
  if (issues.some(issue => issue.type === 'critical')) {
    status = 'unhealthy';
    message = 'Critical issues detected with Supabase connections';
  } else if (issues.some(issue => issue.type === 'warning')) {
    status = 'degraded';
    message = 'Supabase connections are working but some issues detected';
  }
  
  return {
    status,
    message,
    issues
  };
} 