import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }
  
  // För debugging
  console.log('Resource proxy request for path:', path);
  
  try {
    // För _next-resurser, använd alltid Vercel-hostnamnet direkt för att undvika CORS och auth-problem
    const vercelDeploymentUrl = 'devin-handbook.vercel.app';
    
    // Direkt URL-konstruktion för enklare hantering
    let resourceURL;
    
    // För CSS och andra statiska filer, förväntar vi rätt path format
    // Om path börjar med /, behåll det, annars lägg till /
    if (path.startsWith('/')) {
      resourceURL = `https://${vercelDeploymentUrl}${path}`;
    } else {
      resourceURL = `https://${vercelDeploymentUrl}/${path}`;
    }
    
    console.log('Fetching resource from:', resourceURL);
    
    // Använd standardfetch utan extra parametrar för att undvika 401/403
    const response = await fetch(resourceURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-Proxy/1.0',
        'Accept': '*/*',
        'Origin': `https://${vercelDeploymentUrl}`
      },
      next: { revalidate: 3600 } // Caching med revalidering efter 1 timme
    });
    
    if (!response.ok) {
      console.error(`Resource fetch failed: ${response.status} for ${resourceURL}`);
      
      // Ge mer detaljerad felinformation för felsökning
      return new NextResponse(
        JSON.stringify({
          error: `Failed to fetch resource: ${response.statusText}`,
          status: response.status,
          resource: resourceURL,
          path: path
        }), 
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
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
    
    // Ge detaljerad felinformation
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error),
        path: path,
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