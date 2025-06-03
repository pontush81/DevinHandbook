import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Service role client för server-side operationer - skapas endast när behövs
let supabaseAdmin: any = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin && typeof window === 'undefined') {
    // Endast på server-sidan
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables for admin client');
      throw new Error('Missing Supabase configuration');
    }
    
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
}

export interface TrialStatus {
  isInTrial: boolean;
  trialDaysRemaining: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  canCreateHandbook: boolean;
  hasUsedTrial: boolean;
}

export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  email: string | null;
  full_name: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_used: boolean;
  subscription_status: string;
  subscription_end_date: string | null;
  stripe_customer_id: string | null;
  first_handbook_created_at: string | null;
  total_handbooks_created: number;
}

/**
 * Kontrollerar trial-status för en användare (client-side)
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  try {
    const { data, error } = await supabase
      .rpc('check_trial_status', { user_uuid: userId });

    if (error) {
      console.error('Error checking trial status:', error);
      throw error;
    }

    const result = data[0];
    
    // Kontrollera också om användaren har handböcker
    const { data: handbooks, error: handbooksError } = await supabase
      .from('handbooks')
      .select('id, created_during_trial')
      .eq('owner_id', userId);

    if (handbooksError) {
      console.error('Error fetching handbooks:', handbooksError);
    }

    const hasHandbooks = handbooks && handbooks.length > 0;
    const hasTrialHandbook = handbooks?.some(h => h.created_during_trial) || false;

    return {
      isInTrial: result?.is_in_trial || false,
      trialDaysRemaining: result?.trial_days_remaining || 0,
      subscriptionStatus: result?.subscription_status || 'none',
      trialEndsAt: result?.trial_ends_at || null,
      canCreateHandbook: !hasHandbooks || result?.is_in_trial || result?.subscription_status === 'active',
      hasUsedTrial: hasTrialHandbook
    };
  } catch (error) {
    console.error('Error in getTrialStatus:', error);
    return {
      isInTrial: false,
      trialDaysRemaining: 0,
      subscriptionStatus: 'none',
      trialEndsAt: null,
      canCreateHandbook: true, // Default till true för att inte blockera
      hasUsedTrial: false
    };
  }
}

/**
 * Startar trial för en användare (server-side med admin privileges)
 */
export async function startUserTrial(userId: string, userEmail?: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .rpc('start_user_trial', { 
        user_uuid: userId
      });

    if (error) {
      console.error('Error starting trial:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in startUserTrial:', error);
    throw error;
  }
}

/**
 * Hämtar användarprofil (client-side)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Hämtar användarprofil (server-side med admin privileges)
 */
export async function getUserProfileAdmin(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Error fetching user profile (admin):', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfileAdmin:', error);
    return null;
  }
}

/**
 * Uppdaterar användarprofil när första handboken skapas
 */
export async function markFirstHandbookCreated(userId: string): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('user_profiles')
      .update({
        first_handbook_created_at: new Date().toISOString(),
        total_handbooks_created: 1
      })
      .eq('id', userId);

    if (error) {
      console.error('Error marking first handbook created:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markFirstHandbookCreated:', error);
    throw error;
  }
}

/**
 * Kontrollerar om användaren är berättigad till gratis trial (server-side)
 */
export async function isEligibleForTrial(userId: string): Promise<boolean> {
  try {
    const profile = await getUserProfileAdmin(userId);
    
    // Om ingen profil finns - berättigad till trial
    if (!profile) {
      return true;
    }

    // Om trial aldrig använts - berättigad
    if (!profile.trial_used) {
      return true;
    }

    // Om trial använts men inga handböcker skapats - berättigad
    if (profile.trial_used && profile.total_handbooks_created === 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking trial eligibility:', error);
    return false;
  }
}

/**
 * Skapar aktivitetslogg för trial-händelser
 */
export async function logTrialActivity(
  userId: string, 
  activityType: 'trial_started' | 'trial_extended' | 'trial_ended' | 'trial_converted',
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('trial_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        description,
        metadata: metadata || {}
      });

    if (error) {
      console.error('Error logging trial activity:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in logTrialActivity:', error);
    throw error;
  }
}

/**
 * Formaterar datum för visning
 */
export function formatTrialEndDate(trialEndsAt: string | null): string {
  if (!trialEndsAt) return '';
  
  const date = new Date(trialEndsAt);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Kontrollerar om trial har gått ut
 */
export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  
  return new Date(trialEndsAt) < new Date();
}

/**
 * Räknar ut dagar kvar av trial
 */
export function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
} 