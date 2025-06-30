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
        { 
          error: 'No subscription found',
          message: 'Du har ingen aktiv prenumeration att hantera.',
          type: 'no_subscription' 
        },
        { status: 404 }
      );
    }

    console.log(`[Stripe Portal] Found ${subscriptions.length} subscription(s) for user`);

    // Filtera bort uppsagda prenumerationer och manuella/test customer ID:n
    const validSubscriptions = subscriptions.filter(sub => {
      const isActive = sub.status === 'active';
      const isCancelled = sub.metadata?.cancel_at_period_end === true;
      const hasCustomerId = sub.stripe_customer_id;
      const isRealStripeCustomer = hasCustomerId && !sub.stripe_customer_id.includes('manual');
      
      console.log(`[Stripe Portal] Subscription check: status=${sub.status}, cancelled=${isCancelled}, hasCustomerId=${!!hasCustomerId}, isRealStripeCustomer=${isRealStripeCustomer}, customerId=${sub.stripe_customer_id}`);
      
      return hasCustomerId && isActive && !isCancelled && isRealStripeCustomer;
    });

    if (validSubscriptions.length === 0) {
      console.log('[Stripe Portal] No valid (non-cancelled) subscriptions found');
      return NextResponse.json(
        { 
          error: 'No active subscription',
          message: 'Din prenumeration är uppsagd eller inaktiv. Kontakta support om du behöver hjälp.',
          type: 'subscription_cancelled' 
        },
        { status: 404 }
      );
    }

    console.log(`[Stripe Portal] Found ${validSubscriptions.length} valid subscription(s)`);

    // Sortera prenumerationer så att nyaste kommer först (live Stripe är nyare än test)
    const sortedSubscriptions = validSubscriptions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`[Stripe Portal] Sorted subscriptions by date, trying newest first`);

    // Först - verifiera vilka customer ID:n som faktiskt finns i Stripe
    const validCustomerIds = [];
    for (const subscription of sortedSubscriptions) {
      const customerId = subscription.stripe_customer_id;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          console.log(`[Stripe Portal] Verified customer ${customerId} exists in Stripe`);
          validCustomerIds.push(subscription);
        } else {
          console.log(`[Stripe Portal] Customer ${customerId} is deleted in Stripe, skipping`);
        }
      } catch (error: any) {
        console.log(`[Stripe Portal] Customer ${customerId} does not exist in Stripe, skipping`);
      }
    }

    if (validCustomerIds.length === 0) {
      console.log('[Stripe Portal] No valid customers found in Stripe');
      return NextResponse.json(
        { 
          error: 'No valid subscription',
          message: 'Inga giltiga prenumerationer hittades i Stripe. Kontakta support för hjälp.',
          type: 'no_valid_customers'
        },
        { status: 404 }
      );
    }

    console.log(`[Stripe Portal] Found ${validCustomerIds.length} valid customer(s) in Stripe`);

    // Skapa portal session med första giltiga customer
    const subscription = validCustomerIds[0];
    const customerId = subscription.stripe_customer_id;
    
    try {
      console.log(`[Stripe Portal] Creating portal session for verified customer: ${customerId}`);

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      console.log(`[Stripe Portal] Successfully created portal session: ${portalSession.id}`);

      return NextResponse.json({
        url: portalSession.url,
        sessionId: portalSession.id
      });

    } catch (stripeError: any) {
      console.error(`[Stripe Portal] Error creating portal session:`, stripeError.message);
      
      // Konfigurationsproblem
      if (stripeError.message.includes('No configuration provided')) {
        return NextResponse.json(
          { 
            error: 'Stripe configuration missing',
            message: 'Stripe kundportal är inte konfigurerad. Kontakta administratör.',
            type: 'configuration_missing'
          },
          { status: 500 }
        );
      }

      // Allmänt fel
      return NextResponse.json(
        { 
          error: 'Portal session creation failed',
          message: 'Kunde inte skapa prenumerationshantering. Kontakta support för hjälp.',
          type: 'creation_failed',
          details: stripeError.message
        },
                 { status: 500 }
       );
     }

  } catch (error) {
    console.error('[Stripe Portal] Error creating portal session:', error);
    return NextResponse.json(
      { 
        error: 'Server error',
        message: 'Ett serverfel inträffade. Försök igen eller kontakta support.',
        type: 'server_error'
      },
      { status: 500 }
    );
  }
} 