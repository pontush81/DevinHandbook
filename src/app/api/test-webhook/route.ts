import { NextRequest, NextResponse } from 'next/server';
import { handleTrialUpgrade } from '../stripe/webhook/route';

/**
 * Test-endpoint för att simulera Stripe webhook-anrop
 * Används för att testa betalningsflödet utan att behöva gå genom faktisk Stripe-betalning
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[Test Webhook] Simulating Stripe checkout.session.completed event');
    
    // Simulerad Stripe session data
    const mockStripeSession = {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      payment_status: 'paid',
      customer: 'cus_test_' + Date.now(),
      subscription: 'sub_test_' + Date.now(),
      amount_total: 49900, // 499 kr
      currency: 'sek',
      metadata: {
        userId: '9919f4f3-2748-4379-8b8c-790be1d08ae6',
        handbookId: '545e8dce-f400-4c16-9f42-02de06055c6b', // Webhook test handbok ID
        planType: 'monthly'
      }
    };
    
    // Anropa webhook-hanteringen
    await handleTrialUpgrade(mockStripeSession.metadata.userId, mockStripeSession);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook executed successfully',
      sessionId: mockStripeSession.id 
    });
    
  } catch (error) {
    console.error('[Test Webhook] Error:', error);
    console.error('[Test Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 