import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // Protected routes that require authentication
    const protectedPaths = ['/dashboard', '/members', '/admin']
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )
    
    // Auth pages that should redirect if already logged in
    const authPaths = ['/login', '/signup', '/forgot-password']
    const isAuthPath = authPaths.includes(request.nextUrl.pathname)
    
    if (isProtectedPath && (!session || error)) {
      // Redirect to login for protected paths without session
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    if (isAuthPath && session && !error) {
      // Redirect away from auth pages if already logged in
      const redirectTo = request.nextUrl.searchParams.get('redirect') || '/'
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    
  } catch (authError) {
    console.error('Middleware auth error:', authError)
    // Continue with the request even if auth check fails
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes - handle auth separately)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 