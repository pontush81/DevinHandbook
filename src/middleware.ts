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
    '/((?!api|_next|fonts|examples|[\\w-]+\\.\\w+).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  const path = url.pathname;
  
  const handbookSubdomainMatch = hostname.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);
  
  if (handbookSubdomainMatch) {
    const subdomain = handbookSubdomainMatch.groups?.subdomain;
    
    url.pathname = `/handbook/${subdomain}${path}`;
    return NextResponse.rewrite(url);
  }
  
  return NextResponse.next();
}
