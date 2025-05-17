import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }
  
  // Säkerställ att vi endast hämtar resurser från _next
  if (!path.startsWith('/_next/') && !path.startsWith('/static/')) {
    return new NextResponse('Invalid path', { status: 400 });
  }
  
  try {
    // Hämta resursen från rätt källdomän baserat på den aktuella domänen
    const originalUrl = new URL(request.url);
    const host = request.headers.get('host') || '';
    
    // Avgör källdomänen baserat på aktuell host
    let sourceHost = 'handbok.org';
    
    // Om vi är på test-domänen, använd samma domän för att hämta resurser
    if (host.includes('test.handbok.org')) {
      sourceHost = 'test.handbok.org';
    } else if (host.includes('devin-handbook.vercel.app')) {
      sourceHost = 'devin-handbook.vercel.app';
    }
    
    // Preservera alla URL-parametrar från originalförfrågan
    const queryParams = Array.from(originalUrl.searchParams.entries())
      .filter(([key]) => key !== 'path') // Skippa path-parametern
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    // Använd HTTPS för alla resurshämtningar
    const resourceURL = `https://${sourceHost}${path}${queryParams ? '?' + queryParams : ''}`;
    console.log('Proxy resource from:', resourceURL);
    
    // Försök hämta resursen direkt från Vercel CDN om det är en statisk resurs
    const response = await fetch(resourceURL, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': request.headers.get('accept') || '*/*',
        'Accept-Encoding': request.headers.get('accept-encoding') || ''
      }
    });
    
    if (!response.ok) {
      console.error(`Resource fetch failed: ${response.status} for ${resourceURL}`);
      return new NextResponse(`Resource fetch failed: ${response.status}`, { 
        status: response.status 
      });
    }
    
    // Klona svaret och lägg till CORS-headers
    const body = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    const headers = new Headers({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=31536000, immutable'
    });
    
    // Bevara andra viktiga headers från originalsvaret
    const contentEncoding = response.headers.get('content-encoding');
    if (contentEncoding) {
      headers.set('Content-Encoding', contentEncoding);
    }
    
    return new NextResponse(body, {
      headers,
      status: 200
    });
  } catch (error) {
    console.error('Resource proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function OPTIONS() {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400'
  });
  
  return new NextResponse(null, {
    headers,
    status: 204
  });
} 