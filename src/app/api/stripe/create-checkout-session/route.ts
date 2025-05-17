import { createCheckoutSession, isTestMode } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log(`Stripe Checkout körs i ${isTestMode ? 'TESTLÄGE' : 'SKARPT LÄGE'}`);
    
    const { handbookData } = await req.json();

    const { name, subdomain } = handbookData;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const sessionId = Date.now().toString();
    
    const session = await createCheckoutSession(
      name,
      subdomain,
      `${origin}/success?session_id=${sessionId}&handbook_name=${encodeURIComponent(name)}&subdomain=${encodeURIComponent(subdomain)}`,
      `${origin}/create-handbook`
    );

    return NextResponse.json({ 
      sessionId, 
      sessionUrl: session.url,
      isTestMode
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
