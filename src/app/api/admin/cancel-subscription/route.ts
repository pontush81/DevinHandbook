import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, reason } = await req.json();
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    // Hämta subscription info
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
    
    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      );
    }
    
    console.log(`[Admin] Cancelling subscription ${subscriptionId} for user ${subscription.user_id}`);
    
    // 1. Uppdatera subscription status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'admin_cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);
    
    if (updateError) {
      console.error('[Admin] Error updating subscription:', updateError);
      throw updateError;
    }
    
    // 2. Initiera customer offboarding
    const { error: offboardError } = await supabase
      .rpc('initiate_customer_offboarding', {
        p_user_id: subscription.user_id,
        p_reason: reason || 'subscription_cancelled_by_admin'
      });
    
    if (offboardError) {
      console.error('[Admin] Error initiating offboarding:', offboardError);
      // Fortsätt även om offboarding misslyckas
    }
    
    // 3. Logga lifecycle event
    const { error: eventError } = await supabase
      .from('customer_lifecycle_events')
      .insert({
        user_id: subscription.user_id,
        handbook_id: subscription.handbook_id,
        subscription_id: subscription.id,
        event_type: 'subscription_cancelled',
        status: 'completed',
        automated_action: 'admin_cancellation',
        action_completed_at: new Date().toISOString(),
        metadata: {
          cancelled_by: 'admin',
          cancellation_reason: reason || 'admin_cancelled',
          original_plan: subscription.plan_type
        }
      });
    
    if (eventError) {
      console.error('[Admin] Error logging lifecycle event:', eventError);
      // Inte kritiskt
    }
    
    // 4. Om det finns Stripe subscription, avsluta den också
    if (subscription.stripe_subscription_id) {
      try {
        const { stripe } = await import('@/lib/stripe');
        if (stripe) {
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
            metadata: {
              cancelled_by: 'admin',
              cancellation_reason: reason || 'admin_cancelled'
            }
          });
          console.log(`[Admin] Stripe subscription ${subscription.stripe_subscription_id} marked for cancellation`);
        }
      } catch (stripeError) {
        console.error('[Admin] Error cancelling Stripe subscription:', stripeError);
        // Fortsätt även om Stripe-avslutning misslyckas
      }
    }
    
    console.log(`[Admin] Subscription ${subscriptionId} cancelled successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled and offboarding initiated',
      data: {
        subscriptionId,
        userId: subscription.user_id,
        cancelledAt: new Date().toISOString(),
        scheduledDeletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
    
  } catch (error) {
    console.error('[Admin] Error in cancel subscription:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to cancel subscription' 
      },
      { status: 500 }
    );
  }
} 