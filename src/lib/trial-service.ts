import { getServiceSupabase, fetchWithAuth } from '@/lib/supabase';

/**
 * Interface för trial-status - FÖRENKLAD
 */
export interface TrialStatus {
  isInTrial: boolean;
  trialDaysRemaining: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  canCreateHandbook: boolean;
  hasUsedTrial: boolean;
}

/**
 * Interface för förbättrad trial-status med mer detaljerad information
 */
export interface EnhancedTrialStatus extends TrialStatus {
  trialPhase: 'early' | 'engagement' | 'conversion';
  reminders: TrialReminder[];
  nextAction: string;
  urgencyLevel: 'low' | 'medium' | 'high';
}

export interface TrialReminder {
  type: 'trial_ending' | 'trial_expired' | 'payment_required';
  message: string;
  actionText: string;
  urgency: 'low' | 'medium' | 'high';
  daysUntilAction: number;
}

/**
 * Kontrollerar trial-status för en användare (client-side)
 * Detta är ENDAST för att avgöra om användaren kan skapa en FÖRSTA handbok med trial
 * För specifika handböckers status, använd getHandbookTrialStatus()
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // console.log('🔍 [getTrialStatus] Checking user-level trial eligibility for:', userId);
  
  try {
    const supabase = getServiceSupabase();
    
    // Först, kontrollera om användaren är berättigad till trial
    const isEligible = await isEligibleForTrial(userId);
    if (!isEligible) {
      return {
        isInTrial: false,
        trialDaysRemaining: 0,
        subscriptionStatus: 'expired',
        trialEndsAt: null,
        canCreateHandbook: false,
        hasUsedTrial: true,
      };
    }

    // Hämta användarens trial-information från users-tabellen
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('trial_end_date, has_used_trial')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[getTrialStatus] Error fetching user data:', userError);
      throw userError;
    }

    // console.log('🔍 [getTrialStatus] User trial eligibility:', {
    //   userId,
    //   hasTrialEndDate: !!userData?.trial_end_date,
    //   hasUsedTrial: userData?.has_used_trial,
    //   trialEndDate: userData?.trial_end_date
    // });

    if (!userData?.trial_end_date) {
      // Användaren har ingen aktiv trial
      return {
        isInTrial: false,
        trialDaysRemaining: 0,
        subscriptionStatus: userData?.has_used_trial ? 'expired' : 'none',
        trialEndsAt: null,
        canCreateHandbook: !userData?.has_used_trial, // Kan skapa om de inte använt trial än
        hasUsedTrial: userData?.has_used_trial || false,
      };
    }

    // Kontrollera om trial fortfarande är aktiv
    const trialEndDate = new Date(userData.trial_end_date);
    const now = new Date();
    const isStillInTrial = trialEndDate > now;
    const trialDaysRemaining = isStillInTrial ? 
      Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const trialStatus = {
      isInTrial: isStillInTrial,
      trialDaysRemaining: Math.max(0, trialDaysRemaining),
      subscriptionStatus: isStillInTrial ? 'trial' : 'expired',
      trialEndsAt: userData.trial_end_date,
      canCreateHandbook: isStillInTrial,
      hasUsedTrial: true,
    };

    // console.log('[Trial Service] Trial status:', {
    //   userId,
    //   isInTrial: trialStatus.isInTrial,
    //   daysRemaining: trialStatus.trialDaysRemaining,
    //   status: trialStatus.subscriptionStatus
    // });

    return trialStatus;

  } catch (error) {
    console.error('Error getting trial status:', error);
    // Return safe defaults on error
    return {
      isInTrial: false,
      trialDaysRemaining: 0,
      subscriptionStatus: 'error',
      trialEndsAt: null,
      canCreateHandbook: false,
      hasUsedTrial: false,
    };
  }
}

/**
 * Startar en trial för en användare (server-side med service role)
 */
export async function startUserTrial(userId: string, userEmail?: string) {
  console.log('[Trial Service] Starting trial for user:', userId);
  
  try {
    // Använd server-side supabase för RPC-anrop
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data, error } = await supabaseAdmin
      .rpc('start_user_trial', { 
        user_uuid: userId
      });

    if (error) {
      console.error('[Trial Service] Error starting trial:', error);
      throw error;
    }

    console.log('[Trial Service] Trial started successfully:', data);
    return data;
  } catch (error) {
    console.error('[Trial Service] Error in startUserTrial:', error);
    throw error;
  }
}

/**
 * Kontrollerar om en användare är berättigad till trial
 */
export async function isEligibleForTrial(userId: string): Promise<boolean> {
  try {
    const status = await getTrialStatus(userId);
    
    console.log('[Trial Service] Checking eligibility for user:', userId);
    console.log('[Trial Service] Trial status:', {
      hasUsedTrial: status.hasUsedTrial,
      isInTrial: status.isInTrial,
      canCreateHandbook: status.canCreateHandbook,
      subscriptionStatus: status.subscriptionStatus
    });
    
    // Berättigad om användaren inte har använt trial än ELLER är i en aktiv trial
    const eligible = !status.hasUsedTrial || status.isInTrial;
    
    console.log('[Trial Service] Eligibility result:', eligible);
    
    return eligible;
  } catch (error) {
    console.error('Error checking trial eligibility:', error);
    // Default till berättigad vid fel för att inte blockera användare
    return true;
  }
}

/**
 * Hjälpfunktioner för datum och formatering
 */
export function formatTrialEndDate(trialEndsAt: string | null): string {
  if (!trialEndsAt) return 'Okänt datum';
  
  const endDate = new Date(trialEndsAt);
  return endDate.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > new Date(trialEndsAt);
}

export function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Hämtar förbättrad trial-status med påminnelser och rekommendationer
 */
export async function getEnhancedTrialStatus(userId: string): Promise<EnhancedTrialStatus> {
  const basicStatus = await getTrialStatus(userId);
  
  // Bestäm trial-fas
  const trialPhase = getTrialPhase(basicStatus.trialDaysRemaining);
  
  // Generera påminnelser baserat på dagar kvar
  const reminders = getTrialReminders(basicStatus.trialDaysRemaining, basicStatus.isInTrial);
  
  // Bestäm nästa action
  const nextAction = getNextAction(basicStatus);
  
  // Bestäm urgency level
  const urgencyLevel = getUrgencyLevel(basicStatus.trialDaysRemaining, basicStatus.isInTrial);
  
  return {
    ...basicStatus,
    trialPhase,
    reminders,
    nextAction,
    urgencyLevel
  };
}

/**
 * Bestämmer vilken fas av trial användaren är i
 */
export function getTrialPhase(daysRemaining: number): 'early' | 'engagement' | 'conversion' {
  if (daysRemaining > 20) return 'early';
  if (daysRemaining > 7) return 'engagement';
  return 'conversion';
}

/**
 * Genererar påminnelser baserat på trial-status
 */
export function getTrialReminders(daysRemaining: number, isInTrial: boolean): TrialReminder[] {
  const reminders: TrialReminder[] = [];
  
  if (!isInTrial) {
    reminders.push({
      type: 'trial_expired',
      message: 'Din trial har gått ut. Uppgradera för att fortsätta använda handbok.org.',
      actionText: 'Uppgradera nu',
      urgency: 'high',
      daysUntilAction: 0
    });
  } else if (daysRemaining <= 3) {
    reminders.push({
      type: 'trial_ending',
      message: `Din trial går ut om ${daysRemaining} dag${daysRemaining !== 1 ? 'ar' : ''}. Uppgradera för att behålla åtkomst.`,
      actionText: 'Uppgradera nu',
      urgency: 'high',
      daysUntilAction: daysRemaining
    });
  } else if (daysRemaining <= 7) {
    reminders.push({
      type: 'trial_ending',
      message: `Du har ${daysRemaining} dagar kvar av din gratis trial.`,
      actionText: 'Se prisplaner',
      urgency: 'medium',
      daysUntilAction: daysRemaining
    });
  }
  
  return reminders;
}

/**
 * Bestämmer nästa rekommenderade action för användaren
 */
function getNextAction(status: TrialStatus): string {
  if (!status.isInTrial) {
    return 'Uppgradera till betald plan';
  }
  
  if (status.trialDaysRemaining <= 3) {
    return 'Uppgradera innan trial går ut';
  }
  
  if (status.trialDaysRemaining <= 7) {
    return 'Överväg att uppgradera';
  }
  
  return 'Fortsätt utforska funktioner';
}

/**
 * Bestämmer urgency level baserat på trial-status
 */
function getUrgencyLevel(daysRemaining: number, isInTrial: boolean): 'low' | 'medium' | 'high' {
  if (!isInTrial) return 'high';
  if (daysRemaining <= 3) return 'high';
  if (daysRemaining <= 7) return 'medium';
  return 'low';
}

/**
 * Kontrollerar trial-status för en specifik handbok via API
 * Detta undviker RLS-problem genom att använda server-side API
 */
export async function getHandbookTrialStatus(userId: string, handbookId: string): Promise<TrialStatus> {
  try {
    // Använd fetchWithAuth istället för vanlig fetch för automatisk Bearer token authentication
    const response = await fetchWithAuth(`/api/handbook/${handbookId}/trial-status?userId=${userId}`);
    
    if (!response.ok) {
      // 404 betyder att användaren inte äger handboken - detta är normalt och inte ett fel
      if (response.status === 404) {
        // Helt tyst för 404 - detta är förväntat beteende för handböcker användaren inte äger
        return {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'none',
          trialEndsAt: null,
          canCreateHandbook: true,
          hasUsedTrial: false,
        };
      }
      // 403 är också normalt för användare som inte har access - tyst behandling
      if (response.status === 403) {
        return {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'none',
          trialEndsAt: null,
          canCreateHandbook: true,
          hasUsedTrial: false,
        };
      }
      // Endast logga andra typer av fel
      console.error(`[Trial Service] API request failed: ${response.status}`);
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Kontrollera om svaret har fel-format
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Returnera data i rätt format
    return {
      isInTrial: data.isInTrial || false,
      trialDaysRemaining: data.trialDaysRemaining || 0,
      subscriptionStatus: data.subscriptionStatus || 'none',
      trialEndsAt: data.trialEndsAt || null,
      canCreateHandbook: data.canCreateHandbook !== false, // Default till true
      hasUsedTrial: data.hasUsedTrial || false,
    };

  } catch (error) {
    // Logga endast icke-404/403 fel och icke-fetch fel
    if (!error.message?.includes('404') && !error.message?.includes('403') && !error.message?.includes('Failed to fetch')) {
      console.error('[Trial Service] Error in getHandbookTrialStatus:', error);
    }
    return {
      isInTrial: false,
      trialDaysRemaining: 0,
      subscriptionStatus: 'none',
      trialEndsAt: null,
      canCreateHandbook: true,
      hasUsedTrial: false,
    };
  }
} 