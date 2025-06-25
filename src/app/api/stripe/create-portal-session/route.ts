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

    // Hitta användarens Stripe customer ID
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[Stripe Portal] Error fetching subscription:', error);
      return NextResponse.json(
        { error: 'Failed to find subscription' },
        { status: 500 }
      );
    }

    if (!subscription || subscription.length === 0 || !subscription[0].stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription with Stripe customer found' },
        { status: 404 }
      );
    }

    const customerId = subscription[0].stripe_customer_id;

    // Skapa Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`[Stripe Portal] Created portal session: ${portalSession.id}`);

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