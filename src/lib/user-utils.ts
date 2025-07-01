/**
 * Användarrelaterade hjälpfunktioner för att hantera profiles
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase, getAdminClient } from '@/lib/supabase';

/**
 * Säkerställer att en användarprofil finns i profiles-tabellen.
 * Om profilen inte finns skapas den med standardvärden.
 * 
 * @param supabase - Supabase-klienten (används endast för loggning)
 * @param userId - Användarens ID
 * @param email - Användarens e-post
 * @returns Om profilen finns eller kunde skapas
 */
export async function ensureUserProfile(
  supabase: SupabaseClient, 
  userId: string, 
  email: string
): Promise<boolean> {
  try {
    // Använd alltid admin-klienten för att kringgå RLS
    const adminClient = getAdminClient();
    
    if (!userId || !email) {
      console.error('[ensureUserProfile] Felaktiga indata:', { userId, email });
      return false;
    }
    
    // Kontrollera om användaren finns
    const { data: profile, error: fetchError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // Om profilen redan finns, returnera true
    if (profile) {
      return true;
    }
    
    // Om profilen inte finns, skapa den
    if (fetchError || !profile) {
      console.log(`[ensureUserProfile] Skapar profil för användare ${userId}`);
      
      try {
        // Försök skapa profilen direkt via server-sida API om möjligt
        if (typeof window !== 'undefined') {
          // Klientsida - använd API-anrop som kringgår RLS
          const response = await fetch('/api/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              email: email,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('[ensureUserProfile] API-fel:', errorData);
            
            // Fallback till direkt adminClient om API misslyckas
            return await createProfileWithAdminClient(adminClient, userId, email);
          }
          
          return true;
        } else {
          // Server-sida - använd adminClient direkt
          return await createProfileWithAdminClient(adminClient, userId, email);
        }
      } catch (error) {
        console.error('[ensureUserProfile] Fel vid profilskapande:', error);
        
        // Sista försök med adminClient
        return await createProfileWithAdminClient(adminClient, userId, email);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[ensureUserProfile] Oväntat fel:', error);
    
    if (error instanceof Error) {
      console.error('[ensureUserProfile] Felmeddelande:', error.message);
      if ('cause' in error) {
        console.error('[ensureUserProfile] Felorsak:', error.cause);
      }
    }
    
    return false;
  }
}

/**
 * Hjälpfunktion för att skapa en profil med adminClient
 */
async function createProfileWithAdminClient(
  adminClient: SupabaseClient,
  userId: string,
  email: string
): Promise<boolean> {
  try {
    const { error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        is_superadmin: false,
        created_at: new Date().toISOString(),
      });
    
    if (insertError) {
      console.error('[createProfileWithAdminClient] Kunde inte skapa profil:', insertError);
      
      // Logga mer detaljerad information om felet
      if (insertError.message) {
        console.error('[createProfileWithAdminClient] Felmeddelande:', insertError.message);
      }
      if (insertError.details) {
        console.error('[createProfileWithAdminClient] Feldetaljer:', insertError.details);
      }
      
      // Kontrollera igen om profilen kanske har skapats av en annan process
      const { data: recheckedProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
        
      if (recheckedProfile) {
        console.log('[createProfileWithAdminClient] Profil fanns redan eller skapades av annan process');
        return true;
      }
      
      return false;
    }
    
    // Bekräfta att profilen verkligen skapats
    const { data: confirmationProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    return !!confirmationProfile;
  } catch (error) {
    console.error('[createProfileWithAdminClient] Fel:', error);
    return false;
  }
}

/**
 * Kontrollerar om en användare är superadmin.
 * Säkerställer först att användarprofilen finns.
 * 
 * @param supabase - Supabase-klienten (används endast för loggning)
 * @param userId - Användarens ID
 * @param email - Användarens e-post
 * @returns Om användaren är superadmin
 */
export async function checkIsSuperAdmin(
  supabase: SupabaseClient, 
  userId: string, 
  email: string
): Promise<boolean> {
  try {
    if (!userId || !email) {
      console.error('[checkIsSuperAdmin] Felaktiga indata:', { userId, email });
      return false;
    }
    
    // Säkerställ att profilen finns
    const profileExists = await ensureUserProfile(supabase, userId, email);
    if (!profileExists) return false;
    
    // Använd admin-klienten för att kringgå RLS
    const adminClient = getAdminClient();
    
    // Kontrollera superadmin-status
    const { data, error } = await adminClient
      .from('profiles')
      .select('is_superadmin')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[checkIsSuperAdmin] Fel vid kontroll av superadmin:', error);
      return false;
    }
    
    return data && data.is_superadmin === true;
  } catch (error) {
    console.error('[checkIsSuperAdmin] Oväntat fel:', error);
    return false;
  }
}

// Cache för admin-status för att undvika upprepade API-anrop
let adminStatusCache: {
  userId: string;
  isAdmin: boolean;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30000; // 30 sekunder cache

/**
 * Klientsida-funktion för att kontrollera superadmin-status via säker API
 * Denna funktion använder vår säkra endpoint istället för direkta databasanrop
 * Inkluderar cachning för att undvika spam-requests
 */
export async function checkIsSuperAdminClient(userId?: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') {
      // På server-sidan, använd den gamla funktionen
      return false;
    }

    // Använd passad userId eller försök hämta från session som fallback
    let currentUserId = userId;
    if (!currentUserId) {
      try {
        const { getSupabaseClient } = await import('@/lib/supabase-client');
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id || null;
      } catch {
        // Ingen user ID - kan inte använda cache
        currentUserId = null;
      }
    }

    // Kontrollera cache först om vi har user ID
    const now = Date.now();
    if (currentUserId && adminStatusCache && 
        adminStatusCache.userId === currentUserId && 
        (now - adminStatusCache.timestamp) < CACHE_DURATION) {
      return adminStatusCache.isAdmin;
    }

    // Helper function to create auth headers
    const createAuthHeaders = async () => {
      try {
        const { getSupabaseClient } = await import('@/lib/supabase-client');
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          return {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          };
        }
      } catch {}
      return { 'Content-Type': 'application/json' };
    };

    // Since we know user is authenticated when this is called from admin layout,
    // start with Bearer token to avoid unnecessary 401 errors
    let response;
    const headers = await createAuthHeaders();
    
    if (headers.Authorization) {
      // Method 1: Try with Bearer token first (most likely to succeed)
      response = await fetch('/api/auth/check-superadmin', { headers });
      
      // Method 2: If Bearer token fails, try without auth headers as fallback
      if (!response.ok && response.status === 401) {
        response = await fetch('/api/auth/check-superadmin');
      }
    } else {
      // Method 1: No token available, try standard request
      response = await fetch('/api/auth/check-superadmin');
      
      // Method 2: This case is already handled above
    }
    
    // 401 eller 403 betyder bara att användaren inte är superadmin (normalt)
    if (response.status === 401 || response.status === 403) {
      // Uppdatera cache med negativt resultat
      if (currentUserId) {
        adminStatusCache = {
          userId: currentUserId,
          isAdmin: false,
          timestamp: now
        };
      }
      return false;
    }
    
    if (!response.ok) {
      // Endast logga verkliga serverfel (500, etc.)
      console.log('[checkIsSuperAdminClient] API server error:', response.status);
      return false;
    }
    
    const data = await response.json();
    const isAdmin = data.isSuperAdmin || false;
    
    // Uppdatera cache med resultat
    if (currentUserId) {
      adminStatusCache = {
        userId: currentUserId,
        isAdmin,
        timestamp: now
      };
    }
    
    return isAdmin;
  } catch (error) {
    // Endast logga verkliga nätverksfel eller JSON-parsing fel
    console.error('[checkIsSuperAdminClient] Network or parsing error:', error);
    return false;
  }
}

/**
 * Rensa admin-status cache (används vid logout eller user change)
 */
export function clearAdminStatusCache(): void {
  adminStatusCache = null;
} 