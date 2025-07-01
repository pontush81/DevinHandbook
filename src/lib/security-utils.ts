import { NextRequest, NextResponse } from 'next/server';
import { getHybridAuth } from './standard-auth';
import { checkIsSuperAdmin } from './user-utils';
import { getServiceSupabase } from './supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Kontrollerar om en request är tillåten att köra i aktuell miljö
 */
export function isDevelopmentOnly(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Kontrollerar om en request är tillåten att köra i utvecklings- eller staging-miljö
 */
export function isDevOrStaging(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const isStaging = (process.env.VERCEL_ENV === 'preview' || 
                   process.env.NEXT_PUBLIC_APP_URL?.includes('staging')) ?? false;
  
  return nodeEnv === 'development' || isStaging;
}

/**
 * Middleware för att blockera test-/debug-endpoints i produktion
 */
export function requireDevelopmentEnvironment(endpointName: string): NextResponse | null {
  if (!isDevelopmentOnly()) {
    console.error(`[SECURITY] Försök att nå ${endpointName} i produktionsmiljö blockerat`);
    return NextResponse.json(
      { 
        error: 'Denna endpoint är endast tillgänglig i utvecklingsmiljö',
        endpoint: endpointName,
        environment: process.env.NODE_ENV 
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Middleware för att begränsa test-endpoints till dev/staging
 */
export function requireDevOrStagingEnvironment(endpointName: string): NextResponse | null {
  if (!isDevOrStaging()) {
    console.error(`[SECURITY] Försök att nå ${endpointName} i produktionsmiljö blockerat`);
    return NextResponse.json(
      { 
        error: 'Denna endpoint är endast tillgänglig i utvecklings- eller staging-miljö',
        endpoint: endpointName,
        environment: process.env.NODE_ENV 
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Säkerhetskontroll för admin-endpoints
 */
export function requireSecureContext(request: NextRequest): NextResponse | null {
  // Kontrollera att request kommer från säker källa
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [
      'https://www.handbok.org',
      'https://handbok.org'
    ];
    
    if (origin && !allowedOrigins.includes(origin)) {
      console.error(`[SECURITY] Otillåten origin för admin-request: ${origin}`);
      return NextResponse.json(
        { error: 'Otillåten origin' },
        { status: 403 }
      );
    }
  }
  
  return null;
}

/**
 * Enhanced rate limiting with database persistence
 */
export async function rateLimit(request: NextRequest, maxRequests: number = 10, windowMs: number = 60000): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const supabase = getServiceSupabase();
  const now = Date.now();
  const windowStart = now - windowMs;
  
  try {
    // Clean up old entries
    await supabase
      .from('rate_limits')
      .delete()
      .lt('last_reset', windowStart);
    
    // Get current rate limit record
    const { data: rateLimitRecord, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', ip)
      .gte('last_reset', windowStart)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Rate limit check error:', error);
      return null; // Allow request if database error
    }
    
    if (!rateLimitRecord) {
      // First request in window
      await supabase
        .from('rate_limits')
        .upsert({
          identifier: ip,
          count: 1,
          last_reset: now
        });
      return null;
    }
    
    if (rateLimitRecord.count >= maxRequests) {
      console.warn(`[SECURITY] Rate limit överskriden för IP: ${ip}`);
      return NextResponse.json(
        { error: 'För många requests. Försök igen senare.' },
        { status: 429 }
      );
    }
    
    // Increment counter
    await supabase
      .from('rate_limits')
      .update({ count: rateLimitRecord.count + 1 })
      .eq('identifier', ip);
    
    return null;
  } catch (error) {
    console.error('Rate limit error:', error);
    return null; // Allow request if any error occurs
  }
}

/**
 * Hämtar klient-IP från request (med fallbacks för olika miljöer)
 */
export function getClientIP(request: NextRequest): string {
  try {
    return (
      (request as any).ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    );
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Loggar säkerhetsrelaterade händelser
 */
export function logSecurityEvent(event: string, details: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY LOG] ${timestamp} - ${event}`, details);
  
  // I produktion skulle du kunna skicka detta till en säkerhetslogg-service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrera med säkerhetslogg-service
  }
}

// CORS-hantering görs nu via next.config.js för enkelhet och tillförlitlighet 

/**
 * Standardiserad admin-autentisering för alla admin-endpoints
 * Stöder både cookies och Authorization header för maximal tillförlitlighet
 */
export async function adminAuth(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  userEmail?: string;
  response?: NextResponse;
}> {
  try {
    const url = new URL(request.url);
    console.log(`🔐 [AdminAuth] Processing request to ${url.pathname}`);
    
    let user: any = null;
    let authMethod = '';

    // Method 1: Standard SSR cookies (primär metod)
    try {
      console.log('🍪 [AdminAuth] Attempting cookie authentication...');
      const cookieStore = await cookies();
      
      // Debug: Check if cookies are present
      const allCookies = cookieStore.getAll();
      console.log(`🍪 [AdminAuth] Found ${allCookies.length} cookies`);
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              const value = cookieStore.get(name)?.value;
              if (name.includes('supabase') && value) {
                console.log(`🍪 [AdminAuth] Found Supabase cookie: ${name}`);
              }
              return value;
            },
          },
        }
      );

      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();
      
      if (cookieError) {
        console.log('🍪 [AdminAuth] Cookie auth error:', cookieError.message);
      }
      
      if (!cookieError && cookieUser) {
        user = cookieUser;
        authMethod = 'cookies';
        console.log(`🍪 [AdminAuth] Cookie auth successful for user: ${cookieUser.id}`);
      } else {
        console.log('🍪 [AdminAuth] Cookie auth failed or no user found');
      }
    } catch (cookieError) {
      console.log('🍪 [AdminAuth] Cookie auth exception:', cookieError);
      // Continue to fallback method
    }

    // Method 2: Authorization header fallback
    if (!user) {
      console.log('🔑 [AdminAuth] Trying Authorization header fallback...');
      const authHeader = request.headers.get('authorization');
      
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log(`🔑 [AdminAuth] Found Bearer token (length: ${token.length})`);
        
        try {
          const serviceSupabase = getServiceSupabase();
          const { data: { user: tokenUser }, error: tokenError } = await serviceSupabase.auth.getUser(token);
          
          if (tokenError) {
            console.log('🔑 [AdminAuth] Bearer token auth error:', tokenError.message);
          }
          
          if (!tokenError && tokenUser) {
            user = tokenUser;
            authMethod = 'bearer_token';
            console.log(`🔑 [AdminAuth] Bearer token auth successful for user: ${tokenUser.id}`);
          } else {
            console.log('🔑 [AdminAuth] Bearer token auth failed or no user found');
          }
        } catch (tokenError) {
          console.log('🔑 [AdminAuth] Bearer token auth exception:', tokenError);
          // Continue to failure
        }
      } else {
        console.log('🔑 [AdminAuth] No Authorization header found');
      }
    }
    
    if (!user) {
      console.log('❌ [AdminAuth] Both auth methods failed - returning 401');
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: "Ej autentiserad" },
          { status: 401 }
        )
      };
    }

    const userId = user.id;
    const userEmail = user.email || '';
    console.log(`✅ [AdminAuth] User authenticated via ${authMethod}: ${userId} (${userEmail})`);

    // Kontrollera superadmin-behörighet
    console.log(`🔒 [AdminAuth] Checking superadmin status for user: ${userId}`);
    const serviceSupabase = getServiceSupabase();
    const isSuperAdmin = await checkIsSuperAdmin(
      serviceSupabase,
      userId,
      userEmail
    );

    console.log(`🔒 [AdminAuth] Superadmin check result: ${isSuperAdmin}`);

    if (!isSuperAdmin) {
      console.log(`❌ [AdminAuth] User ${userId} (${userEmail}) is not a superadmin - returning 403`);
      
      // Log security event för otillåten admin-åtkomst
      try {
        await logSecurityEvent('unauthorized_admin_access', {
          userId,
          userEmail,
          authMethod,
          endpoint: new URL(request.url).pathname,
          ip: getClientIP(request),
          userAgent: request.headers.get('user-agent')
        });
      } catch (logError) {
        // Silent fail för logging
      }
      
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: "Du har inte superadmin-behörighet" },
          { status: 403 }
        )
      };
    }

    console.log(`✅ [AdminAuth] Successfully authenticated superadmin: ${userId} (${userEmail})`);
    return {
      success: true,
      userId,
      userEmail
    };
    
  } catch (error) {
    console.error('❌ [AdminAuth] Error in admin authentication:', error);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Fel vid autentiseringskontroll" },
        { status: 500 }
      )
    };
  }
}

/**
 * Säker email-hämtning med fallback från databas
 * Används för endpoints som behöver email men inte är admin-endpoints
 */
export async function getUserEmail(userId: string, session?: any): Promise<string> {
  try {
    // Försök från session först
    if (session?.user?.email) {
      return session.user.email;
    }
    
    // Fallback från databas
    if (userId) {
      const supabase = getServiceSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      return profile?.email || '';
    }
    
    return '';
  } catch (error) {
    console.error('Error getting user email:', error);
    return '';
  }
} 