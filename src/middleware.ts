import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_next/static (statiska resurser)
     * 4. /fonts (inside /public)
     * 5. /examples (inside /public)
     * 6. /static (statiska resurser)
     * 7. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|_next/static|fonts|static|examples|[\\w-]+\\.\\w+).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const path = url.pathname;
  
  // Debug information for diagnostics
  console.log(`[Middleware] Processing request: host=${hostname}, path=${path}`);
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[Middleware] Handling OPTIONS request for CORS preflight`);
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
  
  // För test.handbok.org, hantera specifika paths
  if (hostname === 'test.handbok.org') {
    console.log(`[Middleware] Request to test.handbok.org: ${path}`);
    
    // Test-specifika routes
    const testRoutes = ['/test-ui', '/dns-test', '/test-subdomains', '/test-resources'];
    if (path === '/' || testRoutes.includes(path)) {
      console.log(`[Middleware] Detected test route: ${path}`);
      return NextResponse.next();
    }
    
    // För alla andra paths, skicka till huvudapplikationen
    console.log(`[Middleware] Routing standard page on test domain: ${path}`);
    return NextResponse.next();
  }

  // Hantera subdomäner till handbok.org
  const handbookSubdomainMatch = hostname.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);
  
  if (handbookSubdomainMatch) {
    const subdomain = handbookSubdomainMatch.groups?.subdomain;
    console.log(`[Middleware] Detected subdomain: ${subdomain}`);
    
    // Om detta är www, fortsätt som vanligt
    if (subdomain === 'www') {
      console.log(`[Middleware] Handling www subdomain as main site`);
      const response = NextResponse.next();
      // Lägg till CORS-headers för alla responses
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }
    
    // Special case for test domain
    if (subdomain === 'test') {
      console.log(`[Middleware] Handling test subdomain: ${path}`);
      const response = NextResponse.next();
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }
    
    try {
      // Omdirigera till handbook/[subdomain]-routen
      console.log(`[Middleware] Rewriting to handbook route: /handbook/${subdomain}${path}`);
      
      // För vanliga subdomäner, omdirigera till handbook-routen med subdomänen som parameter
      const newUrl = new URL(`/handbook/${subdomain}${path === '/' ? '' : path}`, req.url);
      return NextResponse.rewrite(newUrl);
    } catch (error) {
      console.error(`[Middleware] Error handling subdomain: ${error.message}`);
      // Vid fel, skicka till 404-sidan
      return NextResponse.redirect(new URL('/404', req.url));
    }
  }
  
  // Standard-hantering - ingen subdomain eller speciell route
  console.log(`[Middleware] Standard handling for: ${hostname}${path}`);
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
