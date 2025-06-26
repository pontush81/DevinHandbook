import { NextRequest, NextResponse } from 'next/server';
import { handleTrialUpgrade } from '@/app/api/stripe/webhook/route';

export async function POST(req: NextRequest) {
  try {
    const { handbookId, userId, planType = 'monthly' } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('🧪 [Webhook Simulation] Starting simulation:', { handbookId, userId, planType });

    // Skapa mock Stripe session
    const mockSession = {
      id: 'cs_sim_' + Date.now(),
      object: 'checkout.session',
      payment_status: 'paid',
      customer: 'cus_sim_' + Date.now(),
      subscription: 'sub_sim_' + Date.now(),
      amount_total: planType === 'yearly' ? 149000 : 14900,
      currency: 'sek',
      metadata: {
        userId: userId,
        action: 'upgrade_from_trial',
        type: 'subscription',
        planType: planType,
        ...(handbookId ? { handbookId } : {}) // Inkludera bara om den finns
      }
    };

    console.log('🧪 [Webhook Simulation] Mock session:', JSON.stringify(mockSession, null, 2));

    // Kör webhook-logiken
    await handleTrialUpgrade(userId, mockSession);

    return NextResponse.json({
      success: true,
      message: 'Webhook simulation completed successfully',
      simulatedSession: mockSession
    });

  } catch (error) {
    console.error('❌ [Webhook Simulation] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 