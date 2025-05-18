import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Denna endpoint fungerar som en proxy för statiska resurser för att lösa CORS-problem.
 * Den tar en URL som query-parameter och returnerar resursens innehåll med rätt CORS-headers.
 */
export async function GET(req: NextRequest) {
  try {
    // Extrahera sökvägen från URL
    const url = new URL(req.url);
    const path = url.searchParams.get('path');
    
    if (!path) {
      return new NextResponse('Missing path parameter', { status: 400 });
    }

    // Fullständig URL till den statiska resursen
    const resourceUrl = `https://handbok.org${path}`;
    
    console.log(`Proxying request for: ${resourceUrl}`);
    
    // Hämta resursen med timeout och retries
    let response;
    const maxRetries = 3;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sekunder timeout
        
        response = await fetch(resourceUrl, {
          headers: {
            'User-Agent': req.headers.get('user-agent') || 'Next.js Static Proxy',
            'Accept': '*/*',
            'Origin': 'https://handbok.org'
          },
          signal: controller.signal,
          cache: 'force-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) break;
        
        // Om vi får ett fel men har fler försök kvar, vänta lite och försök igen
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
    
    if (!response || !response.ok) {
      console.error(`Failed to fetch resource: ${resourceUrl}, Status: ${response?.status}`);
      return new NextResponse(`Failed to fetch resource: ${response?.statusText || 'Unknown error'}`, { 
        status: response?.status || 500
      });
    }

    // Skapa en buffer från response
    const buffer = await response.arrayBuffer();
    
    // Bestäm Content-Type baserat på filtyp
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Specifika content-types för olika filtyper
    if (path.endsWith('.woff2')) {
      contentType = 'font/woff2';
    } else if (path.endsWith('.woff')) {
      contentType = 'font/woff';
    } else if (path.endsWith('.ttf')) {
      contentType = 'font/ttf';
    } else if (path.endsWith('.otf')) {
      contentType = 'font/otf';
    } else if (path.endsWith('.css')) {
      contentType = 'text/css; charset=UTF-8';
    } else if (path.endsWith('.js')) {
      contentType = 'application/javascript; charset=UTF-8';
    } else if (path.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (path.endsWith('.png')) {
      contentType = 'image/png';
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    }
    
    // Skapa Response med korrekt headers för CORS
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Timing-Allow-Origin': '*',
        'X-Proxy-Source': 'handbok-static-proxy'
      },
    });
  } catch (error) {
    console.error('Error proxying static resource:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Hantera OPTIONS-förfrågningar för CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}