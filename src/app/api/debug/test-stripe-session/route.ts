import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { handbookId, userId, planType = 'yearly' } = await req.json();

    if (!handbookId || !userId) {
      return NextResponse.json({ error: 'Missing handbookId or userId' }, { status: 400 });
    }

    console.log('🧪 [Test Stripe Session] Creating test session with:', { handbookId, userId, planType });

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Exact same metadata structure as create-subscription
    const metadata: { [key: string]: string } = {
      userId,
      action: 'upgrade_from_trial',
      type: 'subscription',
      planType: planType
    };

    if (handbookId && typeof handbookId === 'string' && handbookId.trim() !== '') {
      metadata.handbookId = handbookId.trim();
    }

    console.log('🧪 [Test Stripe Session] Metadata to send:', metadata);

    // Create a test session (don't complete it)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: `Handbok.org - ${planType === 'yearly' ? 'Årsprenumeration' : 'Månadsprenumeration'}`,
            },
            unit_amount: planType === 'yearly' ? 149000 : 14900,
            recurring: {
              interval: planType === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: 'https://www.handbok.org/upgrade-success?handbookId=' + handbookId,
      cancel_url: 'https://www.handbok.org/upgrade?handbookId=' + handbookId,
      metadata: metadata,
    });

    console.log('🧪 [Test Stripe Session] Created session:', session.id);
    console.log('🧪 [Test Stripe Session] Session metadata verification:', session.metadata);

    // Now retrieve the session to verify metadata was stored
    const retrievedSession = await stripe.checkout.sessions.retrieve(session.id);
    console.log('🧪 [Test Stripe Session] Retrieved session metadata:', retrievedSession.metadata);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      sentMetadata: metadata,
      receivedMetadata: session.metadata,
      retrievedMetadata: retrievedSession.metadata,
      metadataMatch: JSON.stringify(metadata) === JSON.stringify(session.metadata)
    });

  } catch (error: any) {
    console.error('🧪 [Test Stripe Session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error.message },
      { status: 500 }
    );
  }
} 