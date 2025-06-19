import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing customerId' },
        { status: 400 }
      );
    }
    
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }
    
    console.log(`[Admin] Creating portal session for customer ${customerId}`);
    
    // Skapa Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/customer-lifecycle`,
    });
    
    console.log(`[Admin] Portal session created: ${session.id}`);
    
    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
    
  } catch (error) {
    console.error('[Admin] Error creating portal session:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create portal session' 
      },
      { status: 500 }
    );
  }
} 