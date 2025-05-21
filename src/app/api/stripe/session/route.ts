import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-08-16',
});

export async function GET(req: NextRequest) {
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
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch session' }, { status: 500 });
  }
} 