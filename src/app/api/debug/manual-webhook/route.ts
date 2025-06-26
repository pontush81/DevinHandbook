import { NextRequest, NextResponse } from 'next/server';
import { handleTrialUpgrade } from '@/app/api/stripe/webhook/route';

export async function POST(req: NextRequest) {
  try {
    const { handbookId, userId, planType = 'yearly' } = await req.json();

    if (!handbookId || !userId) {
      return NextResponse.json({ error: 'Missing handbookId or userId' }, { status: 400 });
    }

    console.log('🔧 [Manual Webhook] Triggering webhook for:', { handbookId, userId, planType });

    // Skapa mock Stripe session som matchar din betalning
    const mockSession = {
      id: `cs_manual_${Date.now()}`,
      object: 'checkout.session',
      payment_status: 'paid',
      customer: `cus_manual_${Date.now()}`,
      subscription: `sub_manual_${Date.now()}`,
      amount_total: planType === 'yearly' ? 149000 : 14900,
      currency: 'sek',
      metadata: {
        userId,
        action: 'upgrade_from_trial',
        type: 'subscription',
        planType,
        handbookId
      }
    };

    // Kör trial upgrade-logiken direkt
    await handleTrialUpgrade(userId, mockSession);

    return NextResponse.json({ 
      success: true, 
      message: 'Manual webhook completed',
      handbookId,
      userId,
      planType
    });

  } catch (error) {
    console.error('🔧 [Manual Webhook] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 