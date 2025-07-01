import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCSRFToken(): string {
  const token = generateCSRFToken();
  const cookieStore = cookies();
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600 // 1 hour
  });
  
  return token;
}

export function validateCSRFToken(request: NextRequest): boolean {
  const tokenFromHeader = request.headers.get(CSRF_HEADER_NAME);
  const tokenFromCookie = request.cookies.get(CSRF_TOKEN_NAME)?.value;
  
  if (!tokenFromHeader || !tokenFromCookie) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(tokenFromHeader),
    Buffer.from(tokenFromCookie)
  );
}

export function requireCSRFToken(request: NextRequest): NextResponse | null {
  if (!validateCSRFToken(request)) {
    return NextResponse.json(
      { error: 'CSRF token validation failed' },
      { status: 403 }
    );
  }
  return null;
}

// Middleware function to add CSRF protection to state-changing operations
export function withCSRFProtection(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Only check CSRF for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfError = requireCSRFToken(request);
      if (csrfError) {
        return csrfError;
      }
    }
    
    return handler(request);
  };
}

// API endpoint to get CSRF token for frontend
export function getCSRFTokenResponse(): NextResponse {
  const token = setCSRFToken();
  return NextResponse.json({ csrfToken: token });
}