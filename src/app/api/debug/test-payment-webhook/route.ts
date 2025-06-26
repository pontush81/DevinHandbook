import { NextRequest, NextResponse } from 'next/server';
import { handleTrialUpgrade } from '@/app/api/stripe/webhook/route';

export async function POST(request: NextRequest) {
  try {
    const { handbookId, userId, planType = 'monthly' } = await request.json();

    if (!handbookId || !userId) {
      return NextResponse.json(
        { error: 'Missing handbookId or userId' },
        { status: 400 }
      );
    }

    console.log('🧪 [Test Payment Webhook] Starting test with:', { handbookId, userId, planType });

    // Create mock Stripe session that mimics real webhook data
    const mockStripeSession = {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      payment_status: 'paid',
      customer: 'cus_test_' + Date.now(),
      subscription: 'sub_test_' + Date.now(),
      amount_total: planType === 'yearly' ? 149000 : 14900,
      currency: 'sek',
      metadata: {
        userId: userId,
        handbookId: handbookId,
        action: 'upgrade_from_trial',
        type: 'subscription',
        planType: planType
      }
    };

    console.log('🧪 [Test Payment Webhook] Mock session metadata:', JSON.stringify(mockStripeSession.metadata, null, 2));

    // Execute the webhook logic
    await handleTrialUpgrade(userId, mockStripeSession);

    console.log('✅ [Test Payment Webhook] Test completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Test payment webhook executed successfully',
      mockSession: mockStripeSession
    });

  } catch (error) {
    console.error('❌ [Test Payment Webhook] Error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 