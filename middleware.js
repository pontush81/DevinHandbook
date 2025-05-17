// Detta är en Vercel middleware som körs på edge level (Server side)
// Denna fil är placerad i root-katalogen (utanför src) för att Vercel ska hitta den först

export const config = {
  matcher: [
    '/((?!api/resources|api/auth|_next/static|_next/image|favicon.ico|static-resource-fix.js|fonts|debug.html|cors-test.html|cors-status.json|auth-bridge.html).*)',
  ]
};

export default async function middleware(request) {
  // Klona aktuell URL för att hantera omdirigeringar
  const url = new URL(request.url);
  
  // Få host header från förfrågan
  const host = request.headers.get('host') || '';
  
  // Check if we're already in a redirect loop by looking for a special header
  const redirectCount = parseInt(request.headers.get('x-redirect-count') || '0', 10);
  if (redirectCount > 2) {
    return new Response('Too many redirects detected', { status: 508 });
  }
  
  // Kontrollera om det här är en förfrågan från en specifik subdomän
  const subdomainMatch = host.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);
  
  if (request.method === 'OPTIONS') {
    // Hantera OPTIONS preflight requests med CORS-headers
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // Hantera subdomäner inklusive www
  if (subdomainMatch) {
    const subdomain = subdomainMatch.groups?.subdomain;
    
    // För www, omdirigera direkt till huvuddomänen handbok.org
    if (subdomain === 'www') {
      // Create a URL that points to the main domain with the same path
      const redirectUrl = new URL(url.pathname + url.search, 'https://handbok.org');
      return Response.redirect(redirectUrl, 307);
    }
    
    // För statiska resurser, lägg till CORS headers
    if (url.pathname.includes('/_next/') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.woff') || 
        url.pathname.endsWith('.woff2')) {
      
      // För statiska resurser, gör en proxying via handbok.org
      const resourceUrl = `https://handbok.org${url.pathname}${url.search}`;
      
      try {
        const resourceResponse = await fetch(resourceUrl, {
          headers: {
            'Origin': 'https://handbok.org',
            'Referer': 'https://handbok.org'
          }
        });
        
        if (!resourceResponse.ok) {
          return new Response(`Failed to load resource: ${resourceResponse.status}`, { 
            status: resourceResponse.status 
          });
        }
        
        const body = await resourceResponse.arrayBuffer();
        const contentType = resourceResponse.headers.get('content-type') || 'application/octet-stream';
        
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      } catch (error) {
        console.error('Resource proxy error:', error);
        // Fall igenom till vanlig hantering
      }
    }
    
    // Hantera andra subdomäner - redirect to main domain with path
    const newUrl = new URL(`/handbook/${subdomain}${url.pathname}`, 'https://handbok.org');
    newUrl.search = url.search;
    
    // Increment the redirect counter in the header
    const headers = new Headers();
    headers.set('x-redirect-count', String(redirectCount + 1));
    
    return Response.redirect(newUrl.toString(), {
      status: 307,
      headers
    });
  }
  
  // För alla andra förfrågningar, fortsätt normalt
  return Response.next();
} 