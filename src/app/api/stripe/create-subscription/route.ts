import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, handbookId, planType, successUrl, cancelUrl } = await req.json();

    console.log(`🔧 [Stripe Subscription] Creating session with:`, {
      userId,
      handbookId,
      planType,
      successUrl,
      cancelUrl
    });

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    if (!userId || !planType || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Dynamiska priser från miljövariabel
    const yearlyPriceInOre = Number(process.env.HANDBOOK_PRICE) || 149000; // 1490 kr årligt
    const monthlyPriceInOre = Math.round(yearlyPriceInOre / 10); // 149 kr månadsvis (1490/10)
    
    const pricing = {
      monthly: {
        amount: monthlyPriceInOre, // 149 kr/månad (14900 öre)
        interval: 'month' as const,
        name: 'Handbok.org - Månadsprenumeration'
      },
      yearly: {
        amount: yearlyPriceInOre, // 1490 kr/år (149000 öre)
        interval: 'year' as const,
        name: 'Handbok.org - Årsprenumeration'
      }
    };

    console.log(`🔧 [Stripe Subscription] Using prices - Monthly: ${pricing.monthly.amount} öre, Yearly: ${pricing.yearly.amount} öre`);

    const selectedPlan = pricing[planType as keyof typeof pricing];
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan type. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Prepare metadata exactly like in working debug route
    const metadata: { [key: string]: string } = {
      userId,
      action: 'upgrade_from_trial',
      type: 'subscription',
      planType: planType
    };

    // Add handbookId only if it's a valid string
    if (handbookId && typeof handbookId === 'string' && handbookId.trim() !== '') {
      metadata.handbookId = handbookId.trim();
    }

    console.log(`🔧 [Stripe Subscription] Metadata to send:`, metadata);

    // Create session exactly like working debug route
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: selectedPlan.name,
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
      metadata: metadata,
    });

    console.log(`🔧 [Stripe Subscription] Created session: ${session.id}`);
    console.log(`🔧 [Stripe Subscription] Session metadata verification:`, session.metadata);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      planType: planType,
      amount: selectedPlan.amount,
      interval: selectedPlan.interval
    });

  } catch (error: any) {
    console.error('🚨 [Stripe Subscription] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription session', details: error.message },
      { status: 500 }
    );
  }
} 