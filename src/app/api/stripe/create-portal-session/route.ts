import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, returnUrl } = await req.json();

    if (!userId || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, returnUrl' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    console.log(`[Stripe Portal] Creating portal session for user ${userId}`);

    const supabase = getServiceSupabase();

    // Hitta användarens Stripe customer ID från aktiva prenumerationer
    // Exkludera prenumerationer som är uppsagda (cancel_at_period_end = true)
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, status, metadata')
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('[Stripe Portal] Database error:', subError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Stripe Portal] No subscriptions found for user');
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      );
    }

    console.log(`[Stripe Portal] Found ${subscriptions.length} subscription(s) for user`);

    // Filtera bort uppsagda prenumerationer och försök med varje Customer ID
    const validSubscriptions = subscriptions.filter(sub => {
      const isActive = sub.status === 'active';
      const isCancelled = sub.metadata?.cancel_at_period_end === true;
      const hasCustomerId = sub.stripe_customer_id;
      
      console.log(`[Stripe Portal] Subscription check: status=${sub.status}, cancelled=${isCancelled}, hasCustomerId=${!!hasCustomerId}`);
      
      return hasCustomerId && isActive && !isCancelled;
    });

    if (validSubscriptions.length === 0) {
      console.log('[Stripe Portal] No valid (non-cancelled) subscriptions found');
      return NextResponse.json(
        { error: 'Unable to access subscription management. Your subscription may have been fully cancelled. Please contact support if you need assistance.' },
        { status: 404 }
      );
    }

    console.log(`[Stripe Portal] Found ${validSubscriptions.length} valid subscription(s)`);

    // Försök skapa portal session med första giltiga Customer ID
    for (const subscription of validSubscriptions) {
      const customerId = subscription.stripe_customer_id;
      console.log(`[Stripe Portal] Trying customer ID: ${customerId} (status: ${subscription.status})`);
      
      try {
        // Verifiera att customer finns i Stripe innan vi skapar portal session
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted) {
          console.log(`[Stripe Portal] Customer ${customerId} is deleted in Stripe, skipping`);
          continue;
        }

        // Skapa Stripe customer portal session
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });

        console.log(`[Stripe Portal] Successfully created portal session: ${portalSession.id} for customer: ${customerId}`);

        return NextResponse.json({
          url: portalSession.url,
          sessionId: portalSession.id
        });

      } catch (stripeError: any) {
        console.error(`[Stripe Portal] Error with customer ${customerId}:`, stripeError.message);
        
        // Om detta är den sista Customer ID:n, returnera fel
        if (subscription === validSubscriptions[validSubscriptions.length - 1]) {
          return NextResponse.json(
            { error: 'Unable to access subscription management. Your subscription may have been fully cancelled. Please contact support if you need assistance.' },
            { status: 404 }
          );
        }
        
        // Annars fortsätt med nästa Customer ID
        continue;
      }
    }

  } catch (error) {
    console.error('[Stripe Portal] Error creating portal session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
} 