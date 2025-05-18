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
  
  // Track proxy requests to detect loops
  const proxyCount = parseInt(req.headers.get('x-proxy-count') || '0');
  if (proxyCount > 3) {
    console.error('Too many proxy redirects detected');
    
    // Return emergency CSS if this is a CSS request
    if (path.endsWith('.css')) {
      return new NextResponse(
        `/* Emergency CSS - Too many proxy redirects detected */
        body { font-family: system-ui, sans-serif; }
        `, {
          status: 200,
          headers: {
            'Content-Type': 'text/css',
            'Cache-Control': 'no-store, max-age=0',
          }
        }
      );
    }
    
    // For JS, return a minimal script
    if (path.endsWith('.js')) {
      return new NextResponse(
        `console.warn("Resource proxy redirect loop detected for: ${path}");`, {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-store, max-age=0',
          }
        }
      );
    }
    
    return new NextResponse('Too many proxy redirects', { status: 508 });
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
    
    // Fetch the resource with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(resourceUrl, {
      headers: {
        'User-Agent': 'Handbok-Resource-Proxy/1.0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'x-proxy-count': (proxyCount + 1).toString(),
      },
      signal: controller.signal,
      next: { revalidate: 3600 } // Cache for 1 hour in development
    }).finally(() => {
      clearTimeout(timeoutId);
    });
    
    if (!response.ok) {
      console.error(`Error fetching resource: ${response.status} ${response.statusText}`);
      
      // Provide fallback content for important resource types
      if (path.endsWith('.css')) {
        return new NextResponse(
          `/* Fallback CSS for ${path} */
          body {
            font-family: system-ui, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }`, {
            status: 200,
            headers: {
              'Content-Type': 'text/css',
              'Cache-Control': 'no-store',
            }
          }
        );
      }
      
      if (path.includes('.woff') || path.includes('.woff2') || path.includes('.ttf')) {
        // For font files, return a small empty response with the right headers
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Content-Type': path.includes('.woff2') ? 'font/woff2' : 
                            path.includes('.woff') ? 'font/woff' : 'font/ttf',
            'Cache-Control': 'public, max-age=86400',
          }
        });
      }
      
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
        'X-Resource-Origin': resourceDomain,
      },
    });
    
    return newResponse;
  } catch (error) {
    console.error('Resource proxy error:', error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return new NextResponse('Resource fetch timed out', { status: 504 });
    }
    
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Count',
      'Access-Control-Max-Age': '86400',
    },
  });
} 