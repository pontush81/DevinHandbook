import { NextRequest, NextResponse } from 'next/server';

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