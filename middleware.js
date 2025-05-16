// Detta är en Vercel middleware som körs på edge level (Server side)
// Denna fil är placerad i root-katalogen (utanför src) för att Vercel ska hitta den först

export const config = {
  matcher: [
    '/((?!api/resources|api/auth|_next/static|_next/image|favicon.ico|static-resource-fix.js|fonts|debug.html|cors-test.html|cors-status.json|auth-bridge.html).*)',
  ]
};

export default async function middleware(request) {
  // Logga information om förfrågan för att hjälpa till med felsökning
  console.log('Middleware processing:', request.url);
  
  // Klona aktuell URL för att hantera omdirigeringar
  const url = new URL(request.url);
  
  // Få host header från förfrågan
  const host = request.headers.get('host') || '';
  
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
    
    // För statiska resurser, lägg till CORS headers
    if (url.pathname.includes('/_next/') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.woff') || 
        url.pathname.endsWith('.woff2')) {
      
      // För statiska resurser, gör en proxying via handbok.org
      const resourceUrl = `https://handbok.org${url.pathname}${url.search}`;
      
      try {
        const resourceResponse = await fetch(resourceUrl);
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
    
    if (subdomain === 'www') {
      // För www, låt Next.js hantera det normalt med CORS-headers
      return new Response(null, { 
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization'
        }
      });
    } else {
      // Hantera andra subdomäner
      url.pathname = `/handbook/${subdomain}${url.pathname}`;
      
      // Omdirigera till den korrekta handbook-sidan
      return Response.redirect(url);
    }
  }
  
  // För alla andra förfrågningar, fortsätt normalt
  return new Response(null, { 
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization'
    }
  });
} 