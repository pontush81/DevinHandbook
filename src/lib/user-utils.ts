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