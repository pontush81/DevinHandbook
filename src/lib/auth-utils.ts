import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

/**
 * Hämtar en session för servern baserad på cookies
 */
export async function getServerSession() {
  console.log('🔍 [getServerSession] Starting enhanced session check...');
  
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  console.log('🍪 [getServerSession] Found cookies:', { 
    count: allCookies.length, 
    names: allCookies.map(c => c.name),
    supabaseCookies: allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-')).map(c => ({ name: c.name, hasValue: !!c.value }))
  });
  
  // Method 1: Look for the correct auth token cookies (not the code verifier)
  // Supabase uses these cookie patterns:
  // - sb-{project-ref}-auth-token (main auth token)
  // - sb-{project-ref}-auth-token-code-verifier (PKCE verifier - not what we want)
  const authCookie = allCookies.find(c => 
    c.name.includes('auth-token') && 
    !c.name.includes('code-verifier') && 
    (c.name.includes('sb-') || c.name.includes('supabase'))
  );
  
  console.log('🔍 [getServerSession] Method 1: Looking for auth token cookie...');
  console.log('🔍 [getServerSession] Auth cookie found:', authCookie ? authCookie.name : 'none');
  
  if (authCookie && authCookie.value) {
    console.log('🔑 [getServerSession] Found auth cookie:', authCookie.name);
    
    try {
      // Parse the auth token from cookie
      const authData = JSON.parse(decodeURIComponent(authCookie.value));
      
      console.log('🔍 [getServerSession] Parsed auth data keys:', Object.keys(authData || {}));
      
      if (authData && authData.access_token && authData.user) {
        console.log('✅ [getServerSession] Method 1: Valid session found in cookie');
        
        // Create a mock session object that matches Supabase session format
        const session = {
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          expires_in: authData.expires_in,
          expires_at: authData.expires_at,
          token_type: authData.token_type || 'bearer',
          user: authData.user
        };
        
        return session;
      } else {
        console.log('❌ [getServerSession] Method 1: Auth data incomplete:', { 
          hasAccessToken: !!authData?.access_token, 
          hasUser: !!authData?.user 
        });
      }
    } catch (error) {
      console.error('❌ [getServerSession] Method 1: Error parsing auth cookie:', error);
    }
  }
  
  // Method 2: Try to find ANY auth cookie with different patterns
  console.log('🔍 [getServerSession] Method 2: Searching for any Supabase auth data...');
  
  for (const cookie of allCookies) {
    if ((cookie.name.includes('sb-') || cookie.name.includes('supabase')) && 
        cookie.name.includes('auth') && 
        !cookie.name.includes('code-verifier') &&
        cookie.value) {
      
      try {
        const data = JSON.parse(decodeURIComponent(cookie.value));
        if (data && data.access_token && data.user) {
          console.log('✅ [getServerSession] Method 2: Found valid auth data in cookie:', cookie.name);
          return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            expires_at: data.expires_at,
            token_type: data.token_type || 'bearer',
            user: data.user
          };
        }
      } catch (e) {
        // Not valid JSON, continue searching
        continue;
      }
    }
  }
  
  // Method 3: Fallback to SSR client
  console.log('📡 [getServerSession] Method 3: Using SSR client fallback...');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // This is read-only for server components
        },
      },
    }
  );

  console.log('📡 [getServerSession] Calling supabase.auth.getSession()...');
  
  // Hämta session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ [getServerSession] Method 3: Session error:', error);
    console.log('🔍 [getServerSession] All methods failed, returning null');
    return null;
  }

  if (session) {
    console.log('✅ [getServerSession] Method 3: SSR client found session');
    return session;
  }

  console.log('❌ [getServerSession] All authentication methods failed');
  console.log('🔍 [getServerSession] Final diagnosis:');
  console.log('  - Cookie-based auth: Failed');
  console.log('  - SSR client auth: Failed');
  console.log('  - Available cookies:', allCookies.map(c => c.name).join(', '));
  
  return null;
}

/**
 * Kontrollerar om en användare är admin för en viss handbok
 */
export async function isHandbookAdmin(userId: string, handbookId: string): Promise<boolean> {
  // console.log('🔍 [isHandbookAdmin] Checking admin status:', { userId, handbookId });
  
  if (!userId || !handbookId) {
    // console.log('❌ [isHandbookAdmin] Missing required parameters:', { userId: !!userId, handbookId: !!handbookId });
    return false;
  }
  
  try {
    const supabase = getServiceSupabase();
    
    // console.log('📊 [isHandbookAdmin] Querying handbook_members table...');
    const { data, error } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
      
    if (error) {
      console.error('❌ [isHandbookAdmin] Database error:', error);
      return false;
    }
    
    const isAdmin = !!data;
    // console.log('✅ [isHandbookAdmin] Query result:', { data, isAdmin });
    
    return isAdmin;
  } catch (error) {
    console.error('❌ [isHandbookAdmin] Unexpected error:', error);
    return false;
  }
}

/**
 * Kontrollerar om en användare är editor för en viss handbok
 */
export async function isHandbookEditor(userId: string, handbookId: string): Promise<boolean> {
  if (!userId || !handbookId) return false;
  
  try {
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .in('role', ['admin', 'editor'])
      .maybeSingle();
      
    if (error) {
      console.error('Fel vid kontroll av handbok editor status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Oväntat fel vid kontroll av handbok editor status:', error);
    return false;
  }
}

/**
 * Kontrollerar om en användare har åtkomst till en viss handbok (admin, editor eller viewer)
 */
export async function hasHandbookAccess(userId: string, handbookId: string): Promise<boolean> {
  if (!userId || !handbookId) return false;
  
  try {
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('Fel vid kontroll av handbok åtkomst:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Oväntat fel vid kontroll av handbok åtkomst:', error);
    return false;
  }
}

/**
 * Hämtar användarens roll för en viss handbok
 */
export async function getUserRole(userId: string, handbookId: string): Promise<'admin' | 'editor' | 'viewer' | null> {
  if (!userId || !handbookId) return null;
  
  try {
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('handbook_members')
      .select('role')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('Fel vid hämtning av användarroll:', error);
      return null;
    }
    
    return data?.role as 'admin' | 'editor' | 'viewer' | null;
  } catch (error) {
    console.error('Oväntat fel vid hämtning av användarroll:', error);
    return null;
  }
}

/**
 * Hämtar session från request headers (Bearer token) som fallback
 */
export async function getSessionFromRequest(request: Request): Promise<any> {
  console.log('🔍 [getSessionFromRequest] Checking for Bearer token authentication...');
  
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    console.log('🔑 [getSessionFromRequest] Found Bearer token');
    
    // Validate token format before attempting to verify
    if (!token || token.length < 20) {
      console.log('❌ [getSessionFromRequest] Bearer token too short or empty');
      return null;
    }
    
    try {
      // Parse JWT payload to check for sub claim before full verification
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('❌ [getSessionFromRequest] Invalid JWT format');
        return null;
      }
      
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (!payload.sub) {
          console.log('❌ [getSessionFromRequest] JWT missing sub claim');
          return null;
        }
        console.log('✅ [getSessionFromRequest] JWT has valid sub claim:', payload.sub);
      } catch (parseError) {
        console.log('❌ [getSessionFromRequest] Could not parse JWT payload:', parseError.message);
        return null;
      }
      
      // Create a Supabase client and verify the token
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return []; },
            setAll() {}
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ [getSessionFromRequest] Bearer token validation failed:', error);
        return null;
      }
      
      if (user) {
        console.log('✅ [getSessionFromRequest] Bearer token is valid for user:', user.id);
        return {
          access_token: token,
          user,
          token_type: 'bearer'
        };
      }
    } catch (error) {
      console.error('❌ [getSessionFromRequest] Error validating Bearer token:', error);
    }
  } else {
    console.log('🔍 [getSessionFromRequest] No Bearer token found in Authorization header');
  }
  
  return null;
}

/**
 * Förbättrad session-funktion som försöker både cookies och Bearer tokens
 */
export async function getSessionFromRequestOrCookies(request?: Request): Promise<any> {
  console.log('🔍 [getSessionFromRequestOrCookies] Starting comprehensive auth check...');
  
  // Method 1: Try traditional cookie-based session
  const cookieSession = await getServerSession();
  if (cookieSession) {
    console.log('✅ [getSessionFromRequestOrCookies] Cookie-based auth succeeded');
    return cookieSession;
  }
  
  // Method 2: Try Bearer token if request is provided
  if (request) {
    const bearerSession = await getSessionFromRequest(request);
    if (bearerSession) {
      console.log('✅ [getSessionFromRequestOrCookies] Bearer token auth succeeded');
      return bearerSession;
    }
  }
  
  console.log('❌ [getSessionFromRequestOrCookies] All authentication methods failed');
  return null;
} 