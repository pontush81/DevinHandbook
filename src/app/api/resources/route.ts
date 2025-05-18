import { NextRequest, NextResponse } from 'next/server';

/**
 * This API route serves as a proxy for fetching static resources across subdomains
 * to avoid CORS and redirect issues when accessing resources like CSS, JS, and fonts.
 */
export async function GET(req: NextRequest) {
  // Get the resource path from the query string
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  
  if (!path) {
    return new NextResponse('Path parameter is required', { status: 400 });
  }
  
  // Determine the root domain for fetching resources
  const resourceDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'handbok.org';
  
  try {
    // Construct the full URL to fetch
    let resourceUrl = path.startsWith('https://') || path.startsWith('http://') 
      ? path 
      : `https://${resourceDomain}${path.startsWith('/') ? path : `/${path}`}`;
    
    // Always use HTTPS
    resourceUrl = resourceUrl.replace('http://', 'https://');
    
    console.log(`Proxying resource: ${resourceUrl}`);
    
    // Fetch the resource
    const response = await fetch(resourceUrl, {
      headers: {
        'User-Agent': 'Handbok-Resource-Proxy/1.0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.error(`Error fetching resource: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch resource: ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    // Get the content type from the response or infer it from the path
    let contentType = response.headers.get('content-type');
    if (!contentType) {
      if (path.endsWith('.css')) contentType = 'text/css';
      else if (path.endsWith('.js')) contentType = 'application/javascript';
      else if (path.endsWith('.woff2')) contentType = 'font/woff2';
      else if (path.endsWith('.woff')) contentType = 'font/woff';
      else if (path.endsWith('.ttf')) contentType = 'font/ttf';
      else if (path.endsWith('.svg')) contentType = 'image/svg+xml';
      else if (path.endsWith('.png')) contentType = 'image/png';
      else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg';
      else contentType = 'application/octet-stream';
    }
    
    // Get the response body as an array buffer for binary data support
    const arrayBuffer = await response.arrayBuffer();
    
    // Create and return a new response with appropriate headers
    const newResponse = new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
    
    return newResponse;
  } catch (error) {
    console.error('Resource proxy error:', error);
    return new NextResponse('Error fetching resource', { status: 500 });
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 