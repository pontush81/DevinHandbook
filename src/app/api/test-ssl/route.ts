import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = ['arn1', 'waw1'];

// Funktion för att testa SSL-anslutningar med olika metoder
async function testSslConnection(url: string) {
  if (!url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  const results = [];
  const options = [
    { method: 'GET', name: 'GET Standard' },
    { method: 'HEAD', name: 'HEAD Lightweight' },
    { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      name: 'GET med JSON Accept'
    },
    { 
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)' },
      name: 'GET med User-Agent'
    },
    { 
      method: 'GET',
      headers: { 'Origin': 'https://test.handbok.org' },
      name: 'GET med Origin'
    }
  ];
  
  for (const option of options) {
    try {
      console.log(`Testar ${option.name} för ${url}`);
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        method: option.method,
        headers: option.headers || {},
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      
      results.push({
        name: option.name,
        success: true,
        status: response.status,
        statusText: response.statusText,
        timing: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      results.push({
        name: option.name,
        success: false,
        error: error.message,
        errorName: error.name,
        timing: null,
      });
    }
  }
  
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url') || 'db.kjsquvjzctdwgjypcjrg.supabase.co';
    
    console.log(`Kör SSL-test för: ${url}`);
    
    // Testa både basdomänen och API-endpointen
    const baseResults = await testSslConnection(url);
    const apiResults = await testSslConnection(`${url}/rest/v1/`);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tests: {
        base: baseResults,
        api: apiResults,
      },
      environment: {
        runtime: typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node',
        vercelUrl: process.env.VERCEL_URL,
        vercelRegion: process.env.VERCEL_REGION,
        nodeEnv: process.env.NODE_ENV,
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Fel i SSL-testning:', error);
    
    return NextResponse.json({
      error: 'Ett fel uppstod vid SSL-testning',
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

// Tillåt also CORS för enkel testning
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 