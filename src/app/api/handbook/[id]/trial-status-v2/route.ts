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

    console.log('🎯 [Trial Status V2] Direct database query for:', {
      userId,
      handbookId,
      timestamp: new Date().toISOString()
    });

    const supabase = getServiceSupabase();

    // Direct database query for handbook
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, trial_end_date, created_during_trial')
      .eq('id', handbookId)
      .single();

    if (handbookError || !handbook) {
      console.error('❌ [Trial Status V2] Handbook not found:', handbookError);
      return NextResponse.json(
        { error: 'Handbook not found' },
        { status: 404 }
      );
    }

    console.log('📖 [Trial Status V2] Handbook data:', handbook);

    // Direct database query for subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan_type, expires_at, trial_ends_at, cancelled_at')
      .eq('user_id', userId)
      .eq('handbook_id', handbookId)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('❌ [Trial Status V2] Subscription query error:', subError);
    }

    console.log('💳 [Trial Status V2] Subscriptions:', subscriptions);

    // Simple logic: if trial_end_date is null, handbook is paid
    const isInTrial = handbook.trial_end_date !== null;
    const hasActiveSubscription = subscriptions && subscriptions.some(s => s.status === 'active');

    const response = {
      isInTrial: isInTrial,
      trialDaysRemaining: isInTrial ? 30 : 0,
      subscriptionStatus: hasActiveSubscription ? 'active' : (isInTrial ? 'trial' : 'paid'),
      trialEndsAt: handbook.trial_end_date,
      canCreateHandbook: true,
      hasUsedTrial: true,
      debug: {
        handbookTrialEndDate: handbook.trial_end_date,
        activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
        totalSubscriptions: subscriptions?.length || 0,
        logic: `trial_end_date is ${handbook.trial_end_date === null ? 'NULL (paid)' : 'SET (trial)'}`
      }
    };

    console.log('🎯 [Trial Status V2] Response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Trial Status V2] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 