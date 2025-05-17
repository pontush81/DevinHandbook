import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }
  
  // Säkerställ att vi endast hämtar resurser från _next eller static
  if (!path.startsWith('/_next/') && !path.startsWith('/static/')) {
    return new NextResponse('Invalid path', { status: 400 });
  }
  
  try {
    // För _next-resurser, använd alltid Vercel-hostnamnet direkt för att undvika CORS och auth-problem
    // Detta ger oss direktåtkomst till Vercel's CDN
    const vercelDeploymentUrl = 'devin-handbook.vercel.app';
    
    // Preservera alla URL-parametrar från originalförfrågan
    const originalUrl = new URL(request.url);
    const queryParams = Array.from(originalUrl.searchParams.entries())
      .filter(([key]) => key !== 'path') // Skippa path-parametern
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    // Använd alltid Vercel-URL för statiska resurser
    const resourceURL = `https://${vercelDeploymentUrl}${path}${queryParams ? '?' + queryParams : ''}`;
    console.log('Proxy resource directly from Vercel CDN:', resourceURL);
    
    // Använd direkt fetch utan auth-headers för att undvika 401
    const response = await fetch(resourceURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-Proxy/1.0',
        'Accept': '*/*'
      },
      cache: 'force-cache' // Använd caching för bättre prestanda
    });
    
    if (!response.ok) {
      console.error(`Resource fetch failed: ${response.status} for ${resourceURL}`);
      
      // Försök med fallback till direkta URL:en om det misslyckas
      return new NextResponse(`Could not proxy resource: ${response.statusText}`, { 
        status: response.status,
        headers: {
          'X-Original-Url': resourceURL,
          'Access-Control-Allow-Origin': '*'
        }
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
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Proxy-Source': 'vercel-cdn'
    });
    
    // Bevara viktiga headers från originalsvaret
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
    
    // Ge mer detaljerad felinformation
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function OPTIONS() {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  });
  
  return new NextResponse(null, {
    headers,
    status: 204
  });
} 