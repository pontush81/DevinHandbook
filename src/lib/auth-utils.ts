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
    supabaseCookies: allCookies.filter(c => c.name.includes('supabase')).map(c => ({ name: c.name, hasValue: !!c.value }))
  });
  
  // Skapa en Supabase-klient för servern
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
  console.log('🔍 [isHandbookAdmin] Checking admin status:', { userId, handbookId });
  
  if (!userId || !handbookId) {
    console.log('❌ [isHandbookAdmin] Missing required parameters:', { userId: !!userId, handbookId: !!handbookId });
    return false;
  }
  
  try {
    const supabase = getServiceSupabase();
    
    console.log('📊 [isHandbookAdmin] Querying handbook_members table...');
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
    console.log('✅ [isHandbookAdmin] Query result:', { data, isAdmin });
    
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