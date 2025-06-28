import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Auth Debug] === AUTHENTICATION DEBUG ENDPOINT ===');
    
    // Get all cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Get session
    const session = await getServerSession();
    
    // Get request headers
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      url: request.url,
      headers: {
        authorization: authHeader ? 'present' : 'missing',
        cookie: cookieHeader ? cookieHeader.substring(0, 100) + '...' : 'missing'
      },
      cookies: {
        total: allCookies.length,
        names: allCookies.map(c => c.name),
        supabaseCookies: allCookies
          .filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
          .map(c => ({ 
            name: c.name, 
            hasValue: !!c.value,
            valueLength: c.value?.length || 0
          }))
      },
      session: {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
      }
    };
    
    console.log('🔍 [Auth Debug] Debug info:', debugInfo);
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('❌ [Auth Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  }
} 