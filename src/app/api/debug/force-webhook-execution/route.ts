import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { handleTrialUpgrade } from '@/app/api/stripe/webhook/route';

export async function POST(request: NextRequest) {
  try {
    const { handbookId, userId, planType = 'monthly' } = await request.json();

    if (!handbookId || !userId) {
      return NextResponse.json(
        { error: 'Missing handbookId or userId' },
        { status: 400 }
      );
    }

    console.log('🔧 [Force Webhook] Manually executing webhook logic for:', { handbookId, userId, planType });

    const supabase = getServiceSupabase();

    // Verify user is superadmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    const superadminEmails = ['pontus.hberg@gmail.com', 'pontusaiagent@gmail.com'];
    if (!profile || !superadminEmails.includes(profile.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - superadmin required' },
        { status: 403 }
      );
    }

    // Get handbook info before update
    const { data: handbookBefore } = await supabase
      .from('handbooks')
      .select('title, trial_end_date, created_during_trial, owner_id')
      .eq('id', handbookId)
      .single();

    if (!handbookBefore) {
      return NextResponse.json(
        { error: 'Handbook not found' },
        { status: 404 }
      );
    }

    console.log('📖 [Force Webhook] Handbook before:', handbookBefore);

    // Create mock Stripe session data
    const mockStripeSession = {
      id: 'cs_manual_' + Date.now(),
      object: 'checkout.session',
      payment_status: 'paid',
      customer: 'cus_manual_' + Date.now(),
      subscription: 'sub_manual_' + Date.now(),
      amount_total: planType === 'yearly' ? 149000 : 14900,
      currency: 'sek',
      metadata: {
        userId: handbookBefore.owner_id,
        handbookId: handbookId,
        action: 'upgrade_from_trial',
        type: 'subscription',
        planType: planType
      }
    };

    console.log('🎭 [Force Webhook] Executing handleTrialUpgrade with mock session');

    // Execute the webhook logic
    await handleTrialUpgrade(handbookBefore.owner_id, mockStripeSession);

    // Get handbook info after update
    const { data: handbookAfter } = await supabase
      .from('handbooks')
      .select('title, trial_end_date, created_during_trial, owner_id')
      .eq('id', handbookId)
      .single();

    console.log('📖 [Force Webhook] Handbook after:', handbookAfter);

    // Create a lifecycle event to track this manual action
    const { error: lifecycleError } = await supabase
      .from('subscription_lifecycle_events')
      .insert({
        user_id: handbookBefore.owner_id,
        handbook_id: handbookId,
        event_type: 'manual_webhook_execution',
        event_data: {
          executed_by_admin: userId,
          admin_email: profile.email,
          previous_trial_end_date: handbookBefore.trial_end_date,
          action: 'force_webhook_execution',
          mock_session_id: mockStripeSession.id
        }
      });

    if (lifecycleError) {
      console.warn('⚠️ [Force Webhook] Failed to create lifecycle event:', lifecycleError);
    }

    const response = {
      success: true,
      message: `Webhook logic executed successfully for handbook "${handbookAfter.title}"`,
      before: {
        trial_end_date: handbookBefore.trial_end_date,
        status: handbookBefore.trial_end_date ? 'trial' : 'paid'
      },
      after: {
        trial_end_date: handbookAfter.trial_end_date,
        status: handbookAfter.trial_end_date ? 'trial' : 'paid'
      },
      handbook: handbookAfter,
      mockSession: mockStripeSession
    };

    console.log('🎉 [Force Webhook] Success:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Force Webhook] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 