import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, handbookId, planType, successUrl, cancelUrl } = await req.json();

    console.log(`🔧 [Simple Subscription] Creating session with:`, {
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

    // Prepare metadata exactly like in debug route
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

    console.log(`🔧 [Simple Subscription] Metadata to send:`, metadata);

    // Create session exactly like debug route but with real pricing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: 'Handbok Prenumeration',
            },
            unit_amount: planType === 'yearly' ? 149000 : 14900,
            recurring: {
              interval: planType === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
    });

    console.log(`🔧 [Simple Subscription] Created session: ${session.id}`);
    console.log(`🔧 [Simple Subscription] Session metadata verification:`, session.metadata);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      planType,
      amount: planType === 'yearly' ? 149000 : 14900,
      interval: planType === 'yearly' ? 'year' : 'month',
      sentMetadata: metadata,
      receivedMetadata: session.metadata
    });

  } catch (error: any) {
    console.error('🚨 [Simple Subscription] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription session', details: error.message },
      { status: 500 }
    );
  }
} 