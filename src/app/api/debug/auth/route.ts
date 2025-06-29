import { NextRequest, NextResponse } from 'next/server';
import { getHybridAuth } from '@/lib/standard-auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Auth Debug] === AUTHENTICATION DEBUG ENDPOINT ===');
    
    // Get all cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Get session
    const authResult = await getHybridAuth(request);
    
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
      authResult: {
        hasAuth: !!authResult.userId,
        method: authResult.authMethod,
        userId: authResult.userId || null,
        userEmail: authResult.userEmail || null,
        rawData: authResult
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