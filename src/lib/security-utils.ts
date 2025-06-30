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
  const isStaging = process.env.VERCEL_ENV === 'preview' || 
                   process.env.NEXT_PUBLIC_APP_URL?.includes('staging');
  
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
 * Rate limiting baserat på IP (enkel implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(request: NextRequest, maxRequests: number = 10, windowMs: number = 60000): NextResponse | null {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  const current = requestCounts.get(ip);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return null;
  }
  
  if (current.count >= maxRequests) {
    console.warn(`[SECURITY] Rate limit överskriden för IP: ${ip}`);
    return NextResponse.json(
      { error: 'För många requests. Försök igen senare.' },
      { status: 429 }
    );
  }
  
  current.count++;
  return null;
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
 * Hanterar autentisering, email-hämtning och superadmin-kontroll
 */
export async function adminAuth(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  userEmail?: string;
  response?: NextResponse;
}> {
  try {
    console.log('🔍 [AdminAuth] Starting admin authentication...');
    
    // Method 1: Try hybrid auth first
    const authResult = await getHybridAuth(request);
    console.log('🔍 [AdminAuth] Hybrid auth result:', {
      userId: authResult.userId ? 'present' : 'missing',
      authMethod: authResult.authMethod,
      hasSession: !!authResult.session
    });
    
    let userId: string | null = authResult.userId;
    let userEmail = '';
    
    // Method 2: If hybrid auth failed, try direct Supabase client approach
    if (!userId) {
      console.log('🔍 [AdminAuth] Trying direct Supabase client approach...');
      
      try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value;
              },
            },
          }
        );

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!error && user) {
          console.log('✅ [AdminAuth] Direct Supabase auth successful for user:', user.id);
          userId = user.id;
          userEmail = user.email || '';
        } else {
          console.log('⚠️ [AdminAuth] Direct Supabase auth failed:', error?.message);
        }
      } catch (directAuthError) {
        console.log('⚠️ [AdminAuth] Direct auth error:', directAuthError);
      }
    }
    
    // Method 3: If still no user, try Authorization header
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        console.log('🔍 [AdminAuth] Trying Authorization header auth...');
        
        try {
          const token = authHeader.substring(7);
          const cookieStore = await cookies();
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                get(name: string) {
                  return cookieStore.get(name)?.value;
                },
              },
            }
          );
          
          const { data: { user }, error } = await supabase.auth.getUser(token);
          
          if (!error && user) {
            console.log('✅ [AdminAuth] Bearer token auth successful for user:', user.id);
            userId = user.id;
            userEmail = user.email || '';
          }
        } catch (tokenError) {
          console.log('⚠️ [AdminAuth] Bearer token auth failed:', tokenError);
        }
      }
    }
    
    if (!userId) {
      console.log('❌ [AdminAuth] All authentication methods failed');
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: "Ej autentiserad" },
          { status: 401 }
        )
      };
    }

    // Get email if we don't have it yet
    if (!userEmail && authResult.session?.user?.email) {
      userEmail = authResult.session.user.email;
    } else if (!userEmail) {
      // Fallback: hämta email från databasen
      const supabase = getServiceSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      userEmail = profile?.email || '';
    }

    console.log('🔍 [AdminAuth] Final user info:', {
      userId: userId,
      email: userEmail ? 'present' : 'missing'
    });

    // Kontrollera superadmin-behörighet
    const supabase = getServiceSupabase();
    const isSuperAdmin = await checkIsSuperAdmin(
      supabase,
      userId,
      userEmail
    );

    if (!isSuperAdmin) {
      console.log('❌ [AdminAuth] User is not superadmin:', userId);
      
      // Log security event för otillåten admin-åtkomst
      await logSecurityEvent('unauthorized_admin_access', {
        userId,
        userEmail,
        endpoint: new URL(request.url).pathname,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent')
      });
      
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: "Du har inte superadmin-behörighet" },
          { status: 403 }
        )
      };
    }

    console.log('✅ [AdminAuth] Superadmin authentication successful:', userId);
    
    // Log admin access för audit
    await logSecurityEvent('admin_access', {
      userId,
      userEmail,
      endpoint: new URL(request.url).pathname,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent')
    });

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