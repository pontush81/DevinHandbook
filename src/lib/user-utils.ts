/**
 * Användarrelaterade hjälpfunktioner för att hantera profiles
 */
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Säkerställer att en användarprofil finns i profiles-tabellen.
 * Om profilen inte finns skapas den med standardvärden.
 * 
 * @param supabase - Supabase-klienten
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
    // Kontrollera om användaren finns
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // Om profilen inte finns, skapa den
    if (fetchError || !profile) {
      console.log(`[ensureUserProfile] Skapar profil för användare ${userId}`);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          is_superadmin: false, // Standard: inte superadmin
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('[ensureUserProfile] Kunde inte skapa profil:', insertError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[ensureUserProfile] Oväntat fel:', error);
    return false;
  }
}

/**
 * Kontrollerar om en användare är superadmin.
 * Säkerställer först att användarprofilen finns.
 * 
 * @param supabase - Supabase-klienten
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
    // Säkerställ att profilen finns
    const profileExists = await ensureUserProfile(supabase, userId, email);
    if (!profileExists) return false;
    
    // Kontrollera superadmin-status
    const { data, error } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', userId)
      .single();
    
    return !error && data && data.is_superadmin === true;
  } catch (error) {
    console.error('[checkIsSuperAdmin] Fel vid kontroll av superadmin:', error);
    return false;
  }
} 