import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not initialized. Missing API key.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id');

  if (!session_id) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    // Return only safe metadata
    return NextResponse.json({
      metadata: session.metadata || {},
      customer_email: session.customer_details?.email || null,
      payment_status: session.payment_status,
      subdomain: session?.metadata?.subdomain || null,
      handbook_name: session?.metadata?.handbookName || null,
      session,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe session:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch session' }, { status: 500 });
  }
} 