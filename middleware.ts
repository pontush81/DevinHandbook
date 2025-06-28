import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simplified middleware - only handle basic redirects, not auth
  // Auth is now handled by individual pages and layouts
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Only handle domain redirects
  if (request.nextUrl.hostname === 'handbok.org') {
    return NextResponse.redirect(new URL(`https://www.handbok.org${request.nextUrl.pathname}`, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Only match requests that might need domain redirects
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 