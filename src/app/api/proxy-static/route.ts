import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Denna endpoint fungerar som en proxy för statiska resurser för att lösa CORS-problem.
 * Den tar en URL som query-parameter och returnerar resursens innehåll med rätt CORS-headers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  // Logga för felsökning
  console.log(`[Static Proxy] Requested URL: ${url}`);
  
  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }
  
  try {
    // Kontrollera så att URL:en är rimlig, tillåt endast vissa domäner
    const parsedUrl = new URL(url);
    const allowedDomains = [
      'handbok.org',
      'www.handbok.org',
      'test.handbok.org',
      'hej.handbok.org',
      'devin-handbook.vercel.app',
    ];
    
    // Verifiera att URL:en är för Next.js statiska resurser eller inom tillåtna domäner
    if (!parsedUrl.pathname.startsWith('/_next/') && 
        !parsedUrl.pathname.startsWith('/static/') &&
        !allowedDomains.some(domain => parsedUrl.hostname.includes(domain) || parsedUrl.hostname.endsWith('vercel.app'))) {
      return NextResponse.json({ error: 'Invalid URL domain or resource type' }, { status: 403 });
    }
    
    // Hämta den statiska resursen
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const resourceResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'StaticResourceProxy/1.0',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    
    // Om resursen inte kunde hämtas
    if (!resourceResponse.ok) {
      console.error(`[Static Proxy] Failed to fetch: ${url}, status: ${resourceResponse.status}`);
      return NextResponse.json({
        error: `Failed to fetch resource: ${resourceResponse.status} ${resourceResponse.statusText}`,
        url
      }, { status: resourceResponse.status });
    }
    
    // Extrahera Content-Type från originalsvaret
    const contentType = resourceResponse.headers.get('Content-Type') || 'application/octet-stream';
    const resourceContent = await resourceResponse.arrayBuffer();
    
    // Skapa ett nytt svar med innehållet och rätt CORS-headers
    const response = new NextResponse(resourceContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      }
    });
    
    return response;
  } catch (error) {
    console.error(`[Static Proxy] Error proxying resource: ${error.message}`);
    return NextResponse.json({
      error: `Error fetching resource: ${error.message}`,
      url
    }, { status: 500 });
  }
}

// Hantera OPTIONS-förfrågningar för CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
} 