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
  const host = request.headers.get('host') || '';
  
  console.log(`Middleware: ${request.method} ${url.pathname} - Host: ${host}`);
  
  // Enkel detection av subdomäner
  const subdomainMatch = host.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);
  
  // OPTIONS request - hantera CORS
  if (request.method === 'OPTIONS') {
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
  
  // Hantera subdomäner - men bara vissa typer av förfrågningar
  if (subdomainMatch) {
    const subdomain = subdomainMatch.groups?.subdomain;
    
    // Specifik hantering för www endast
    if (subdomain === 'www') {
      const redirectUrl = new URL(url.pathname + url.search, 'https://handbok.org');
      return Response.redirect(redirectUrl.toString(), 307);
    }
    
    // VIKTIGT: Kontrollera om vi redan är på handbook-sidan eller har en cookie som indikerar att vi har redirectats
    // Detta stoppar redirect-loops
    if (url.pathname.startsWith(`/handbook/${subdomain}`) || request.cookies.has('subdomain_redirected')) {
      return Response.next();
    }
    
    // För standard-pages (inte resurser), omdirigera till handbook-path
    if (url.pathname === '/' || !url.pathname.includes('.')) {
      const newUrl = new URL(`/handbook/${subdomain}`, 'https://handbok.org');
      
      // Sätt en cookie för att förhindra ytterligare redirects
      const response = Response.redirect(newUrl.toString(), 307);
      
      // Försök sätta en cookie som indikerar att vi har omdirigerat
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Set-Cookie', 'subdomain_redirected=true; Path=/; HttpOnly; Max-Age=3600');
      
      return newResponse;
    }
  }
  
  // För alla andra förfrågningar, fortsätt normalt
  return Response.next();
} 