import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Endast hantera domain redirects - inget annat!
  if (request.nextUrl.hostname === 'handbok.org') {
    return NextResponse.redirect(new URL(`https://www.handbok.org${request.nextUrl.pathname}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Matcha endast requests som behöver domain redirects
     * Undvik API routes för att inte störa deras funktionalitet
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
} 