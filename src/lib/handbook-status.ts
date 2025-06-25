import { getServiceSupabase } from '@/lib/supabase';

export interface HandbookStatus {
  handbookId: string;
  isPaid: boolean;
  isInTrial: boolean;
  trialEndDate: string | null;
  hasActiveSubscription: boolean;
  subscriptionCount: number;
}

/**
 * ENKEL REGEL: 
 * - trial_end_date = null → Handbok är BETALD
 * - trial_end_date = datum → Handbok är i TRIAL
 * 
 * Inget annat spelar roll. Enkelt och tydligt.
 */
export async function getHandbookStatus(handbookId: string, userId: string): Promise<HandbookStatus> {
  const supabase = getServiceSupabase();
  
  console.log('📊 [Handbook Status] Checking status for:', { handbookId, userId });

  // 1. Hämta handbok
  const { data: handbook, error: handbookError } = await supabase
    .from('handbooks')
    .select('id, title, trial_end_date, owner_id')
    .eq('id', handbookId)
    .single();

  if (handbookError || !handbook) {
    throw new Error(`Handbook not found: ${handbookError?.message || 'Unknown error'}`);
  }

  // 2. Hämta prenumerationer (för statistik)
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('status, plan_type')
    .eq('user_id', userId)
    .eq('handbook_id', handbookId)
    .eq('status', 'active');

  if (subError) {
    console.warn('⚠️ [Handbook Status] Subscription query failed:', subError);
  }

  // 3. ENKEL LOGIK
  const isPaid = handbook.trial_end_date === null;
  const isInTrial = handbook.trial_end_date !== null;
  const hasActiveSubscription = (subscriptions?.length || 0) > 0;

  const status: HandbookStatus = {
    handbookId,
    isPaid,
    isInTrial,
    trialEndDate: handbook.trial_end_date,
    hasActiveSubscription,
    subscriptionCount: subscriptions?.length || 0
  };

  console.log('✅ [Handbook Status] Result:', status);
  return status;
}

/**
 * Markera handbok som betald (sätt trial_end_date till null)
 */
export async function markHandbookAsPaid(handbookId: string): Promise<void> {
  const supabase = getServiceSupabase();
  
  console.log('💳 [Handbook Status] Marking handbook as paid:', handbookId);

  const { error } = await supabase
    .from('handbooks')
    .update({ 
      trial_end_date: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', handbookId);

  if (error) {
    throw new Error(`Failed to mark handbook as paid: ${error.message}`);
  }

  console.log('✅ [Handbook Status] Handbook marked as paid');
}

/**
 * Konvertera till trial-status format för bakåtkompatibilitet
 */
export function toTrialStatusResponse(status: HandbookStatus) {
  return {
    isInTrial: status.isInTrial,
    trialDaysRemaining: status.isInTrial ? 30 : 0,
    subscriptionStatus: status.isPaid ? (status.hasActiveSubscription ? 'active' : 'paid') : 'trial',
    trialEndsAt: status.trialEndDate,
    canCreateHandbook: true,
    hasUsedTrial: true
  };
} 