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

    // Hitta användarens Stripe customer ID från alla prenumerationer (inte bara aktiva)
    // Vi letar efter den senaste prenumerationen som har ett Stripe customer ID
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, status, created_at')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5); // Ta de 5 senaste för att hitta en som fungerar

    if (error) {
      console.error('[Stripe Portal] Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to find subscription' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscription with Stripe customer found' },
        { status: 404 }
      );
    }

    // Försök med varje Customer ID tills vi hittar en som fungerar
    let portalSession = null;
    let workingCustomerId = null;

    for (const subscription of subscriptions) {
      const customerId = subscription.stripe_customer_id;
      
      try {
        console.log(`[Stripe Portal] Trying customer ID: ${customerId} (status: ${subscription.status})`);
        
        // Först kontrollera att kunden finns i Stripe
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted) {
          console.log(`[Stripe Portal] Customer ${customerId} is deleted in Stripe, skipping`);
          continue;
        }

        // Skapa Stripe Customer Portal session
        portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });

        workingCustomerId = customerId;
        console.log(`[Stripe Portal] Successfully created portal session: ${portalSession.id} for customer: ${customerId}`);
        break;

      } catch (customerError: any) {
        console.warn(`[Stripe Portal] Failed to create portal session for customer ${customerId}:`, customerError.message);
        
        // Om kunden inte finns, fortsätt till nästa
        if (customerError.code === 'resource_missing') {
          console.log(`[Stripe Portal] Customer ${customerId} not found in Stripe, trying next...`);
          continue;
        }
        
        // För andra fel, logga men fortsätt
        console.error(`[Stripe Portal] Unexpected error for customer ${customerId}:`, customerError);
        continue;
      }
    }

    // Om ingen Customer ID fungerade
    if (!portalSession) {
      console.error('[Stripe Portal] No working Stripe customer found for user');
      return NextResponse.json(
        { error: 'Unable to access subscription management. Your subscription may have been fully cancelled. Please contact support if you need assistance.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      url: portalSession.url
    });

  } catch (error) {
    console.error('[Stripe Portal] Error creating portal session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
} 