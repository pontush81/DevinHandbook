import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id: handbookId } = await params;

    if (!userId || !handbookId) {
      return NextResponse.json(
        { error: 'Missing userId or handbookId' },
        { status: 400 }
      );
    }

    console.log('📊 [Handbook Status] Checking status for:', { handbookId, userId });

    const supabase = getServiceSupabase();

    // 1. First check if the user owns this handbook
    const { data: handbookOwnership, error: ownershipError } = await supabase
      .from('handbooks')
      .select('id, owner_id, trial_end_date, created_during_trial')
      .eq('id', handbookId)
      .eq('owner_id', userId)
      .single();

    if (ownershipError || !handbookOwnership) {
      return NextResponse.json(
        { 
          error: 'Handbook not found or access denied',
          details: ownershipError?.message 
        },
        { status: 404 }
      );
    }

    // 2. Check for handbook-specific subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan_type, expires_at, trial_ends_at, cancelled_at')
      .eq('user_id', userId)
      .eq('handbook_id', handbookId)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (subError) {
      console.error('Error checking subscriptions:', subError);
    }

    // 3. Determine trial status
    let trialStatus;

    // If there's an active subscription for this handbook
    if (subscriptions && subscriptions.length > 0) {
      const subscription = subscriptions[0];
      
      if (subscription.status === 'active') {
        trialStatus = {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'active',
          trialEndsAt: subscription.trial_ends_at,
          canCreateHandbook: true,
          hasUsedTrial: true,
          isPaid: true,
          hasActiveSubscription: true,
          subscriptionCount: 1
        };
      } else if (subscription.status === 'cancelled') {
        trialStatus = {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'cancelled',
          trialEndsAt: subscription.trial_ends_at,
          canCreateHandbook: false,
          hasUsedTrial: true,
          isPaid: false,
          hasActiveSubscription: false,
          subscriptionCount: 1
        };
      }
    } else {
      // No subscription, check handbook's trial_end_date
      if (!handbookOwnership.trial_end_date) {
        // No trial_end_date means it's fully paid
        trialStatus = {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'active',
          trialEndsAt: null,
          canCreateHandbook: true,
          hasUsedTrial: handbookOwnership.created_during_trial || false,
          isPaid: true,
          hasActiveSubscription: false,
          subscriptionCount: 0
        };
      } else {
        // Check if trial is still active
        const trialEndDate = new Date(handbookOwnership.trial_end_date);
        const now = new Date();
        const isStillInTrial = trialEndDate > now;
        const trialDaysRemaining = isStillInTrial ? 
          Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        trialStatus = {
          isInTrial: isStillInTrial,
          trialDaysRemaining: Math.max(0, trialDaysRemaining),
          subscriptionStatus: isStillInTrial ? 'trial' : 'expired',
          trialEndsAt: handbookOwnership.trial_end_date,
          canCreateHandbook: true,
          hasUsedTrial: handbookOwnership.created_during_trial || false,
          isPaid: false,
          hasActiveSubscription: false,
          subscriptionCount: 0
        };
      }
    }

    console.log('✅ [Handbook Status] Result:', trialStatus);

    return NextResponse.json(trialStatus);

  } catch (error) {
    console.error('Error in handbook trial status API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 