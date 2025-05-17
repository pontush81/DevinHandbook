import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /fonts (inside /public)
     * 4. /examples (inside /public)
     * 5. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|fonts|examples|[\\w-]+\\.\\w+).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  const path = url.pathname;
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
  
  // Add CORS headers to all responses
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  
  // Special handling for static resources
  if (path.startsWith('/_next/') || path.includes('/static/')) {
    // Allow static resources to be loaded from anywhere
    return response;
  }
  
  // Undantag för testdomänen - låt den fungera utan omskrivning
  if (hostname === 'test.handbok.org') {
    console.log('Test domain detected, skipping rewrite');
    return response;
  }
  
  const handbookSubdomainMatch = hostname.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);
  
  if (handbookSubdomainMatch) {
    const subdomain = handbookSubdomainMatch.groups?.subdomain;
    
    // If this is www, just continue
    if (subdomain === 'www') {
      return response;
    }
    
    url.pathname = `/handbook/${subdomain}${path}`;
    return NextResponse.rewrite(url);
  }
  
  return response;
}
