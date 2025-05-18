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
    
    // Hämta resursen
    const response = await fetch(resourceUrl, {
      headers: {
        'User-Agent': req.headers.get('user-agent') || 'Next.js Static Proxy',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch resource: ${resourceUrl}, Status: ${response.status}`);
      return new NextResponse(`Failed to fetch resource: ${response.statusText}`, { 
        status: response.status 
      });
    }

    // Skapa en buffer från response
    const buffer = await response.arrayBuffer();
    
    // Bestäm Content-Type baserat på filtyp
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (path.endsWith('.woff2')) {
      contentType = 'font/woff2';
    } else if (path.endsWith('.woff')) {
      contentType = 'font/woff';
    } else if (path.endsWith('.ttf')) {
      contentType = 'font/ttf';
    } else if (path.endsWith('.css')) {
      contentType = 'text/css';
    } else if (path.endsWith('.js')) {
      contentType = 'application/javascript';
    }
    
    // Skapa Response med korrekt headers för CORS
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}