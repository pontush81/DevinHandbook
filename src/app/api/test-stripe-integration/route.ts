import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, handbookName, subdomain } = await req.json();
    
    if (!userId || !handbookName || !subdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, handbookName, subdomain' },
        { status: 400 }
      );
    }
    
    console.log(`[Test] Simulating Stripe payment for user ${userId}`);
    
    // Simulera en lyckad Stripe-betalning
    const mockStripeSession = {
      id: `cs_test_${Date.now()}`,
      customer: `cus_test_${Date.now()}`,
      subscription: null, // Engångsbetalning
      amount_total: 30000, // 300 kr i öre
      currency: 'sek',
      metadata: {
        handbookName,
        subdomain,
        userId
      }
    };
    
    // Skapa handbok
    const { createHandbookWithSectionsAndPages } = await import('@/lib/handbook-service');
    const handbookResult = await createHandbookWithSectionsAndPages(handbookName, subdomain, userId);
    
    if (!handbookResult || !handbookResult.id) {
      throw new Error('Failed to create handbook');
    }
    
    const handbookId = handbookResult.id;
    
    // Integrera med customer lifecycle
    await integrateWithCustomerLifecycle(userId, handbookId, mockStripeSession);
    
    return NextResponse.json({
      success: true,
      message: 'Stripe integration test completed successfully',
      data: {
        userId,
        handbookId,
        handbookName,
        subdomain,
        stripeSessionId: mockStripeSession.id
      }
    });
    
  } catch (error) {
    console.error('[Test] Error in Stripe integration test:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Test failed' 
      },
      { status: 500 }
    );
  }
}

async function integrateWithCustomerLifecycle(userId: string, handbookId: string, stripeSession: any) {
  const supabase = getServiceSupabase();
  
  try {
    console.log(`[Test] Integrating with customer lifecycle for user ${userId}`);
    
    // 1. Skapa subscription record
    const subscriptionData = {
      user_id: userId,
      handbook_id: handbookId,
      plan_type: 'basic',
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 år
      stripe_subscription_id: stripeSession.subscription || null,
      stripe_customer_id: stripeSession.customer || null,
      last_payment_at: new Date().toISOString(),
      next_payment_due: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      auto_renewal: true,
      metadata: {
        stripe_session_id: stripeSession.id,
        payment_amount: stripeSession.amount_total,
        currency: stripeSession.currency,
        test_mode: true
      }
    };
    
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (subError) {
      console.error('[Test] Error creating subscription:', subError);
      throw subError;
    }
    
    console.log(`[Test] Created subscription: ${subscription.id}`);
    
    // 2. Uppdatera account status
    const accountStatusData = {
      user_id: userId,
      status: 'active',
      can_access_handbooks: true,
      can_create_handbooks: true,
      max_handbooks: 10,
      suspended_at: null,
      scheduled_deletion_at: null,
      warning_sent_at: null,
      metadata: {
        subscription_id: subscription.id,
        activated_via: 'stripe_payment_test',
        activation_date: new Date().toISOString()
      }
    };
    
    const { error: statusError } = await supabase
      .from('account_status')
      .upsert(accountStatusData, { onConflict: 'user_id' });
    
    if (statusError) {
      console.error('[Test] Error updating account status:', statusError);
      throw statusError;
    }
    
    console.log(`[Test] Updated account status for user ${userId}`);
    
    // 3. Logga lifecycle event
    const lifecycleEventData = {
      user_id: userId,
      handbook_id: handbookId,
      subscription_id: subscription.id,
      event_type: 'subscription_created',
      status: 'completed',
      automated_action: 'stripe_payment_completed_test',
      action_completed_at: new Date().toISOString(),
      metadata: {
        stripe_session_id: stripeSession.id,
        payment_amount: stripeSession.amount_total,
        currency: stripeSession.currency,
        handbook_name: stripeSession.metadata?.handbookName,
        subdomain: stripeSession.metadata?.subdomain,
        test_mode: true
      }
    };
    
    const { error: eventError } = await supabase
      .from('customer_lifecycle_events')
      .insert(lifecycleEventData);
    
    if (eventError) {
      console.error('[Test] Error logging lifecycle event:', eventError);
      throw eventError;
    }
    
    console.log(`[Test] Customer lifecycle integration completed for user ${userId}`);
    
  } catch (error) {
    console.error('[Test] Error in customer lifecycle integration:', error);
    throw error;
  }
} 