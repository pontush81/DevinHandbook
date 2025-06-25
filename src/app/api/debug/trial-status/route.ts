import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get handbooks owned by user
    const { data: handbooks, error: handbooksError } = await supabase
      .from('handbooks')
      .select('id, title, slug, created_at, trial_end_date, created_during_trial')
      .eq('owner_id', userId);

    // Get subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    // Calculate what trial status should be
    const now = new Date();
    let calculatedTrialStatus = 'unknown';
    let trialDaysRemaining = 0;
    
    if (userProfile) {
      if (userProfile.trial_ends_at) {
        const trialEndDate = new Date(userProfile.trial_ends_at);
        trialDaysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        calculatedTrialStatus = trialDaysRemaining > 0 ? 'active' : 'expired';
      }
    }

    const debugInfo = {
      userId,
      currentTime: now.toISOString(),
      userProfile: userProfile || 'Not found',
      profileError: profileError?.message || null,
      handbooks: handbooks || [],
      handbooksError: handbooksError?.message || null,
      subscriptions: subscriptions || [],
      subscriptionsError: subsError?.message || null,
      calculatedTrialStatus,
      trialDaysRemaining,
      issues: []
    };

    // Check for potential issues
    if (!userProfile) {
      debugInfo.issues.push('User profile not found');
    } else {
      if (!userProfile.trial_ends_at) {
        debugInfo.issues.push('No trial end date set');
      }
      if (!userProfile.trial_started_at) {
        debugInfo.issues.push('No trial start date set');
      }
      if (userProfile.trial_used === false && handbooks && handbooks.length > 0) {
        debugInfo.issues.push('User has handbooks but trial_used is false');
      }
    }

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('Debug trial status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 