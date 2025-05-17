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
  
  // DEBUG: Logga information om förfrågan för att diagnostisera
  console.log(`Middleware processing: ${request.method} ${url.pathname} - Host: ${host}`);
  
  // Check if we're already in a redirect loop by looking for a special header or cookie
  const redirectCount = parseInt(request.headers.get('x-redirect-count') || '0', 10);
  
  // Förhindra för många redirects - en säkerhetsmekanism
  if (redirectCount > 2) {
    console.log(`Too many redirects detected (${redirectCount})`);
    return new Response('Too many redirects detected', { 
      status: 508,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
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
    
    // Loggning för att diagnostisera
    console.log(`Subdomain detected: ${subdomain}`);
    
    // För www, omdirigera direkt till huvuddomänen handbok.org
    if (subdomain === 'www') {
      // Create a URL that points to the main domain with the same path
      const redirectUrl = new URL(url.pathname + url.search, 'https://handbok.org');
      console.log(`Redirecting www to main domain: ${redirectUrl.toString()}`);
      return Response.redirect(redirectUrl.toString(), 307);
    }
    
    // För statiska resurser, lägg till CORS headers
    if (url.pathname.startsWith('/_next/') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.woff') || 
        url.pathname.endsWith('.woff2')) {
      
      console.log(`Static resource detected: ${url.pathname}`);
      
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
          console.log(`Resource fetch failed: ${resourceResponse.status}`);
          return new Response(`Failed to load resource: ${resourceResponse.status}`, { 
            status: resourceResponse.status 
          });
        }
        
        const body = await resourceResponse.arrayBuffer();
        const contentType = resourceResponse.headers.get('content-type') || 'application/octet-stream';
        
        console.log(`Serving proxied resource: ${url.pathname}`);
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
    
    // VIKTIGT: Kontrollera om vi redan är på handbook-sidan för att undvika redirect-loop
    if (url.pathname.startsWith(`/handbook/${subdomain}`)) {
      console.log(`Already on the correct handbook path: ${url.pathname}`);
      return Response.next();
    }
    
    // Hantera andra subdomäner - redirect to main domain with path
    const newUrl = new URL(`/handbook/${subdomain}${url.pathname === '/' ? '' : url.pathname}`, 'https://handbok.org');
    newUrl.search = url.search;
    
    console.log(`Redirecting subdomain to handbook path: ${newUrl.toString()}`);
    
    // Increment the redirect counter in the header
    const headers = new Headers();
    headers.set('x-redirect-count', String(redirectCount + 1));
    
    return Response.redirect(newUrl.toString(), 307);
  }
  
  // För alla andra förfrågningar, fortsätt normalt
  console.log('Continuing with regular request processing');
  return Response.next();
} 