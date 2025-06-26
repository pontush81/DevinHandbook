import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, handbookId } = await req.json();

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    console.log('🔧 [Debug Metadata] Input:', { userId, handbookId, handbookIdType: typeof handbookId });

    // Prepare metadata exactly like in create-subscription
    const metadata: { [key: string]: string } = {
      userId: userId || 'test-user',
      action: 'upgrade_from_trial',
      type: 'subscription',
      planType: 'yearly'
    };

    // Add handbookId only if it's a valid string
    if (handbookId && typeof handbookId === 'string' && handbookId.trim() !== '') {
      metadata.handbookId = handbookId.trim();
      console.log('✅ [Debug Metadata] Added handbookId to metadata:', handbookId.trim());
    } else {
      console.log('❌ [Debug Metadata] handbookId not valid:', { handbookId, type: typeof handbookId });
    }

    console.log('📊 [Debug Metadata] Final metadata:', metadata);

    // Create a simple checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: 'Test Product',
            },
            unit_amount: 1000, // 10 SEK
          },
          quantity: 1,
        },
      ],
      success_url: 'https://handbok.org/success',
      cancel_url: 'https://handbok.org/cancel',
      metadata: metadata,
    });

    console.log('🎯 [Debug Metadata] Created session:', session.id);
    console.log('🎯 [Debug Metadata] Session metadata from Stripe:', session.metadata);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sentMetadata: metadata,
      receivedMetadata: session.metadata
    });

  } catch (error: any) {
    console.error('❌ [Debug Metadata] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create test session' 
    }, { status: 500 });
  }
} 