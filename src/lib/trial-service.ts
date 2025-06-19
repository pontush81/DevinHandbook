import { supabase } from '@/lib/supabase';

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
      hasUsedTrial: hasTrialHandbook,
    };
  } catch (error) {
    console.error('Error in getTrialStatus:', error);
    return {
      isInTrial: false,
      trialDaysRemaining: 0,
      subscriptionStatus: 'none',
      trialEndsAt: null,
      canCreateHandbook: true, // Default till true för att inte blockera
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
    
    // Berättigad om användaren inte har använt trial än ELLER är i en aktiv trial
    return !status.hasUsedTrial || status.isInTrial;
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