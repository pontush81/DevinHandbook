import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const supabase = getServiceSupabase();

    // Hämta alla aktiva prenumerationer
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, stripe_customer_id, status, metadata, handbook_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const results = [];

    for (const subscription of subscriptions || []) {
      const customerId = subscription.stripe_customer_id;
      const isCancelled = subscription.metadata?.cancel_at_period_end === true;
      
      let stripeExists = false;
      let stripeError = null;
      
      try {
        const customer = await stripe.customers.retrieve(customerId);
        stripeExists = !customer.deleted;
      } catch (error: any) {
        stripeError = error.message;
      }
      
      results.push({
        subscriptionId: subscription.id,
        handbookId: subscription.handbook_id,
        customerId,
        isCancelled,
        stripeExists,
        stripeError,
        canUsePortal: stripeExists && !isCancelled
      });
    }

    const workingSubscriptions = results.filter(r => r.canUsePortal);

    return NextResponse.json({
      userId,
      totalSubscriptions: results.length,
      workingSubscriptions: workingSubscriptions.length,
      results,
      recommendation: workingSubscriptions.length > 0 
        ? `Use handbook ${workingSubscriptions[0].handbookId} for portal access`
        : 'No working subscriptions found. Create a new subscription to access portal.'
    });

  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 