import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|static-resource-fix.js|debug.html|static).*)'],
};

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // Skip middleware for static resources to avoid CORS issues
  if (
    pathname.includes('/_next') || 
    pathname.includes('/static') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }
  
  // Only process subdomains on production
  if (process.env.NODE_ENV !== 'development') {
    // Check if we're on a handbok.org subdomain
    const subdomainMatch = hostname.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);

    if (subdomainMatch?.groups?.subdomain && 
        subdomainMatch.groups.subdomain !== 'www' && 
        subdomainMatch.groups.subdomain !== 'api') {
      
      const subdomain = subdomainMatch.groups.subdomain;
      
      // If we're at root path on a subdomain, show the handbook
      if (pathname === '/') {
        // Redirect to handbook view for this subdomain
        return NextResponse.rewrite(new URL(`/handbook/${subdomain}${search}`, req.url));
      }
    }
  }
  
  // For all other cases, continue with normal flow
  return NextResponse.next();
}
