import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, handbookId, planType, successUrl, cancelUrl } = await req.json();

    if (!userId || !planType || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Ny prissättning
    const pricing = {
      monthly: {
        amount: 14900, // 149 kr i öre
        interval: 'month' as const,
        name: 'Handbok.org - Månadsprenumeration',
        description: 'Digital handbok för din förening med full funktionalitet'
      },
      yearly: {
        amount: 149000, // 1490 kr i öre  
        interval: 'year' as const,
        name: 'Handbok.org - Årsprenumeration',
        description: 'Digital handbok för din förening med full funktionalitet (spara 20%!)'
      }
    };

    const selectedPlan = pricing[planType as keyof typeof pricing];
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan type. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    console.log(`[Stripe Subscription] Creating ${planType} subscription for user ${userId}${handbookId ? ` and handbook ${handbookId}` : ''}`);

    // Skapa Stripe checkout session för prenumeration
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.amount,
            recurring: {
              interval: selectedPlan.interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        handbookId: handbookId || '',
        action: 'upgrade_from_trial',
        type: 'subscription',
        planType: planType
      },
      // Automatisk insamling av skatteuppgifter
      automatic_tax: {
        enabled: false, // Sätter till false för enkelhets skull
      },
      // Kunduppgifter - customer skapas automatiskt i subscription mode
      billing_address_collection: 'required'
    });

    console.log(`[Stripe Subscription] Created ${planType} session: ${session.id}`);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      planType: planType,
      amount: selectedPlan.amount,
      interval: selectedPlan.interval
    });

  } catch (error: any) {
    console.error('[Stripe Subscription] Error creating subscription:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create subscription session' 
      },
      { status: 500 }
    );
  }
} 