import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

/**
 * Hämtar en session för servern baserad på cookies
 */
export async function getServerSession() {
  console.log('🔍 [getServerSession] Starting session check...');
  
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  console.log('🍪 [getServerSession] Found cookies:', { 
    count: allCookies.length, 
    names: allCookies.map(c => c.name),
    supabaseCookies: allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-')).map(c => ({ name: c.name, hasValue: !!c.value }))
  });
  
  // Look for the correct auth token cookies (not the code verifier)
  // Supabase uses these cookie patterns:
  // - sb-{project-ref}-auth-token (main auth token)
  // - sb-{project-ref}-auth-token-code-verifier (PKCE verifier - not what we want)
  const authCookie = allCookies.find(c => 
    c.name.includes('auth-token') && 
    !c.name.includes('code-verifier') && 
    (c.name.includes('sb-') || c.name.includes('supabase'))
  );
  
  console.log('🔍 [getServerSession] Looking for auth token cookie (excluding code-verifier)...');
  console.log('🔍 [getServerSession] Auth cookie found:', authCookie ? authCookie.name : 'none');
  
  if (authCookie && authCookie.value) {
    console.log('🔑 [getServerSession] Found auth cookie:', authCookie.name);
    
    try {
      // Parse the auth token from cookie
      const authData = JSON.parse(decodeURIComponent(authCookie.value));
      
      console.log('🔍 [getServerSession] Parsed auth data keys:', Object.keys(authData || {}));
      
      if (authData && authData.access_token && authData.user) {
        console.log('✅ [getServerSession] Valid session found in cookie');
        
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
        console.log('❌ [getServerSession] Auth data incomplete:', { 
          hasAccessToken: !!authData?.access_token, 
          hasUser: !!authData?.user 
        });
      }
    } catch (error) {
      console.error('❌ [getServerSession] Error parsing auth cookie:', error);
    }
  }
  
  // Fallback to SSR client
  console.log('📡 [getServerSession] Using SSR client fallback...');
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
    console.error('❌ [getServerSession] Session error:', error);
  }
  
  console.log('✅ [getServerSession] Session result:', { 
    hasSession: !!session, 
    userId: session?.user?.id || 'no session',
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'no expiry'
  });
  
  return session;
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