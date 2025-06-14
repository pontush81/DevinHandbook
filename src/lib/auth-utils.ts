import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

/**
 * Hämtar en session för servern baserad på cookies
 */
export async function getServerSession() {
  const cookieStore = await cookies();
  
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

  // Hämta session
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Kontrollerar om en användare är admin för en viss handbok
 */
export async function isHandbookAdmin(userId: string, handbookId: string): Promise<boolean> {
  if (!userId || !handbookId) return false;
  
  try {
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
      
    if (error) {
      console.error('Fel vid kontroll av handbok admin status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Oväntat fel vid kontroll av handbok admin status:', error);
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