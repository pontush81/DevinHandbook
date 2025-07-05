import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

/**
 * Enhanced standard authentication function compatible with existing hybrid system
 * Supports: cookies, query parameters, Bearer tokens, and development mode
 */
export async function getStandardSession(request?: NextRequest) {
  try {
    console.log('🔍 [StandardAuth] getStandardSession called');
    
    // Method 1: Try cookies first (standard SSR approach)
    console.log('🔍 [StandardAuth] Trying cookies authentication...');
    const cookieStore = await cookies();
    
    const supabase = createServerClient<Database>(
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
      console.log('✅ [StandardAuth] Cookie authentication successful for user:', user.id);
      // Create session-like object for compatibility
      return {
        user,
        access_token: 'authenticated-user',
        token_type: 'authenticated',
        expires_at: Date.now() + 3600000,
        expires_in: 3600,
        refresh_token: null
      };
    } else {
      console.log('⚠️ [StandardAuth] Cookie authentication failed:', error?.message || 'no user found');
    }
    
    // Method 2: Try query parameter fallback (for join system compatibility)
    if (request) {
      const { searchParams } = new URL(request.url);
      const queryUserId = searchParams.get('userId');
      
      if (queryUserId) {
        // Create a mock session object for compatibility
        // Note: This should only be used for specific endpoints that expect this pattern
        return {
          user: { id: queryUserId },
          access_token: 'query-parameter-auth',
          token_type: 'query-parameter',
          expires_at: Date.now() + 3600000, // 1 hour from now
          expires_in: 3600,
          refresh_token: null
        };
      }
    }
    
    // Method 3: Try Bearer token
    if (request) {
      const authHeader = request.headers.get('Authorization');
      console.log('🔍 [StandardAuth] Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'not found');
      
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          
          // Verify token with Supabase
          const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
          
          if (!tokenError && user) {
            return {
              user,
              access_token: token,
              token_type: 'bearer',
              expires_at: Date.now() + 3600000,
              expires_in: 3600,
              refresh_token: null
            };
          }
        } catch (tokenError) {
          // Token verification failed, continue to other auth methods
        }
      }
    }
    
    return null;
    
  } catch (error) {
    return null;
  }
}

/**
 * Get user ID with multiple fallback methods (compatible with existing system)
 */
export async function getStandardUserId(request?: NextRequest): Promise<string | null> {
  try {
    // Try session first
    const session = await getStandardSession(request);
    if (session?.user?.id) {
      return session.user.id;
    }
    
    // Fallback to query parameter (for join system compatibility)
    if (request) {
      const { searchParams } = new URL(request.url);
      const queryUserId = searchParams.get('userId');
      if (queryUserId) {
        return queryUserId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ [StandardAuth] Error getting user ID:', error);
    return null;
  }
}

/**
 * Check if user has access to a specific handbook (compatible with query params)
 */
export async function hasHandbookAccess(userId: string, handbookId: string): Promise<boolean> {
  if (!userId || !handbookId) return false;
  
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient<Database>(
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
    
    const { data, error } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('[StandardAuth] Handbook access check error:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('[StandardAuth] Unexpected error checking handbook access:', error);
    return false;
  }
}

/**
 * Check if user is admin for a specific handbook
 */
export async function isHandbookAdmin(userId: string, handbookId: string): Promise<boolean> {
  if (!userId || !handbookId) return false;
  
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient<Database>(
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
    
    const { data, error } = await supabase
      .from('handbook_members')
      .select('role')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('[StandardAuth] Admin check error:', error);
      return false;
    }
    
    return data?.role === 'admin';
  } catch (error) {
    console.error('[StandardAuth] Unexpected error checking admin status:', error);
    return false;
  }
}

/**
 * Hybrid authentication helper - tries session first, then query params
 * This maintains compatibility with existing endpoints
 */
export async function getHybridAuth(request?: NextRequest): Promise<{
  userId: string | null;
  session: any | null;
  authMethod: 'session' | 'query-param' | 'bearer' | null;
}> {
  try {
    // Try session authentication first
    const session = await getStandardSession(request);
    
    if (session?.user?.id) {
      const authMethod = session.token_type === 'query-parameter' ? 'query-param' :
                        session.token_type === 'bearer' ? 'bearer' : 'session';
      
      return {
        userId: session.user.id,
        session,
        authMethod
      };
    }
    
    // If no session but request provided, try query parameter
    if (request) {
      const { searchParams } = new URL(request.url);
      const queryUserId = searchParams.get('userId');
      
      if (queryUserId) {
        return {
          userId: queryUserId,
          session: null,
          authMethod: 'query-param'
        };
      }
    }
    
    return {
      userId: null,
      session: null,
      authMethod: null
    };
    
  } catch (error) {
    console.error('[StandardAuth] Hybrid auth error:', error);
    return {
      userId: null,
      session: null,
      authMethod: null
    };
  }
}

/**
 * Standard authentication response helpers
 */
export const AUTH_RESPONSES = {
  UNAUTHENTICATED: { 
    error: 'Du måste vara inloggad',
    status: 401 
  },
  UNAUTHORIZED: { 
    error: 'Du har inte behörighet till denna resurs',
    status: 403 
  },
  HANDBOOK_ACCESS_DENIED: { 
    error: 'Du har inte åtkomst till denna handbok',
    status: 403 
  }
} as const; 