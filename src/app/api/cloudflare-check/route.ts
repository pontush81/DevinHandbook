import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    if (!supabaseUrl) {
      return NextResponse.json({
        error: 'NEXT_PUBLIC_SUPABASE_URL är inte definierad',
        status: 'configuration_error'
      }, { status: 500 });
    }
    
    console.log(`Kontrollerar Cloudflare SSL för: ${supabaseUrl}`);
    
    // Testresultat
    const results = {
      timestamp: new Date().toISOString(),
      supabaseUrl: supabaseUrl.replace(/^(https?:\/\/[^.]+).*$/, '$1...'), // Visa bara början av URL:en
      tests: {
        directFetch: await testDirectFetch(supabaseUrl),
        httpsFetch: await testHttpsFetch(supabaseUrl),
        alternativePorts: await testAlternativePorts(supabaseUrl),
        dnsLookup: await testDnsLookup(supabaseUrl),
        headerCheck: await testHeaderCheck(supabaseUrl),
      },
      cloudflareStatus: null,
      recommendation: ''
    };
    
    // Analysera resultaten för att avgöra om det är ett Cloudflare SSL-problem
    results.cloudflareStatus = determineCloudflareStatus(results.tests);
    results.recommendation = generateRecommendation(results.cloudflareStatus, results.tests);
    
    return NextResponse.json(results, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: `Oväntat fel: ${error.message}`,
      status: 'unexpected_error'
    }, { status: 500 });
  }
}

// Testa direkt anslutning till Supabase URL
async function testDirectFetch(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      error: null,
      isCloudflareError: response.status === 526 || response.status === 525
    };
  } catch (error) {
    return {
      success: false,
      status: null,
      statusText: null,
      error: error.message,
      isCloudflareError: error.message?.includes('SSL') || 
                         error.message?.includes('certificate') ||
                         error.message?.includes('526')
    };
  }
}

// Testa anslutning med strikt HTTPS
async function testHttpsFetch(url: string) {
  try {
    // Säkerställ att vi använder HTTPS
    const httpsUrl = url.replace(/^http:\/\//, 'https://');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(httpsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Cloudflare-SSL-Check'
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      error: null,
      url: httpsUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url: url.replace(/^http:\/\//, 'https://')
    };
  }
}

// Testa anslutning på alternativa portar
async function testAlternativePorts(url: string) {
  const results = {};
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
  
  // Testa några vanliga portar
  const portsToTest = [443, 8443];
  
  for (const port of portsToTest) {
    const testUrl = `${baseUrl}:${port}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      results[port] = {
        success: response.ok,
        status: response.status,
        error: null
      };
    } catch (error) {
      results[port] = {
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
}

// Testa DNS-uppslagning
async function testDnsLookup(url: string) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Vi kan inte göra DNS-uppslagning direkt från en webbläsare, 
    // men vi kan testa en enkel fetch som ger oss information
    const dnsTestResult = {
      hostname,
      resolvable: false,
      error: null
    };
    
    try {
      // Fetch mot domänen ska utlösa DNS-uppslagning
      await fetch(`https://${hostname}/favicon.ico`, {
        method: 'HEAD',
        cache: 'no-store'
      });
      
      dnsTestResult.resolvable = true;
    } catch (error) {
      // Om det är ett nätverksfel (inte DNS-fel) anses domänen vara upplösbar
      if (error.message && !error.message.includes('getaddrinfo') && !error.message.includes('resolve')) {
        dnsTestResult.resolvable = true;
        dnsTestResult.error = 'Domänen kunde hittas men gav annat fel: ' + error.message;
      } else {
        dnsTestResult.error = error.message;
      }
    }
    
    return dnsTestResult;
  } catch (error) {
    return {
      hostname: 'okänd',
      resolvable: false,
      error: error.message
    };
  }
}

// Testa HTTP-headers
async function testHeaderCheck(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    // Extrahera viktiga headers för diagnos
    const headers = {};
    const importantHeaders = [
      'server', 'cf-ray', 'cf-cache-status', 'expect-ct',
      'strict-transport-security', 'alt-svc', 'nel'
    ];
    
    for (const header of importantHeaders) {
      headers[header] = response.headers.get(header) || null;
    }
    
    // Kontrollera om det verkar vara Cloudflare
    const isCloudflare = !!response.headers.get('cf-ray');
    
    return {
      headers,
      isCloudflare,
      status: response.status
    };
  } catch (error) {
    return {
      error: error.message,
      headers: {},
      isCloudflare: false
    };
  }
}

// Avgör om det är ett Cloudflare SSL-problem baserat på resultaten
function determineCloudflareStatus(tests) {
  // Direkta tecken på Cloudflare 526/525 fel
  if (tests.directFetch.status === 526 || tests.directFetch.status === 525) {
    return 'confirmed_cloudflare_ssl_error';
  }
  
  // SSL-relaterade fel med Cloudflare-headers
  if (tests.directFetch.error && 
      tests.directFetch.error.includes('SSL') && 
      tests.headerCheck.isCloudflare) {
    return 'likely_cloudflare_ssl_error';
  }
  
  // Headers antyder Cloudflare, men annat fel
  if (tests.headerCheck.isCloudflare && tests.directFetch.status >= 500) {
    return 'cloudflare_error_not_ssl';
  }
  
  // Anslutningen fungerar
  if (tests.directFetch.success) {
    return 'no_cloudflare_error';
  }
  
  // DNS-problem
  if (!tests.dnsLookup.resolvable) {
    return 'dns_resolution_error';
  }
  
  // Annat nätverksfel
  return 'other_network_error';
}

// Generera specifika rekommendationer baserat på testresultaten
function generateRecommendation(status, tests) {
  switch (status) {
    case 'confirmed_cloudflare_ssl_error':
      return 'Din Supabase-instans har ett bekräftat Cloudflare SSL-valideringsfel (Error 526). Detta beror oftast på ett problem med SSL-certifikatet på Supabase-sidan. Kontrollera att ditt Supabase-projekt är aktivt och inte pausat. Använd SmartSupabaseClient som automatiskt hanterar detta fel genom att använda proxy-anslutning som fallback.';
      
    case 'likely_cloudflare_ssl_error':
      return 'Din anslutning till Supabase uppvisar tecken på Cloudflare SSL-problem. Verifiera att ditt Supabase-projekt är aktivt i Supabase-konsolen. Om problemet kvarstår, överväg att använda SmartSupabaseClient som har inbyggd felhantering för detta.';
      
    case 'cloudflare_error_not_ssl':
      return 'Cloudflare rapporterar ett fel, men det verkar inte vara SSL-relaterat. Kontrollera statusen för din Supabase-instans och se om den är nere för underhåll.';
      
    case 'dns_resolution_error':
      return 'Det finns ett problem med att hitta din Supabase-instans. Kontrollera att din NEXT_PUBLIC_SUPABASE_URL är korrekt konfigurerad och att domänen existerar.';
      
    case 'no_cloudflare_error':
      return 'Anslutningen till Supabase fungerar korrekt. Inga Cloudflare SSL-problem hittades.';
      
    default:
      return 'Det finns ett nätverksproblem med din Supabase-anslutning, men det verkar inte vara ett Cloudflare SSL-problem. Kontrollera din nätverksanslutning och Supabase-projektets status.';
  }
} 