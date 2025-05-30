import { isTestMode, stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function GET() {
  // Hämta priset från miljövariabeln eller använd standardvärdet 300 öre (3 kr)
  const priceAmount = Number(process.env.HANDBOOK_PRICE) || 300;

  // Välj rätt publishable key baserat på testläge
  const publishableKey = isTestMode 
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Kontrollera om Stripe är konfigurerat
  const stripeStatus = stripe ? 'initialized' : 'not configured';

  return NextResponse.json({ 
    isTestMode,
    environment: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    stripeStatus,
    publishableKey, // Returnera rätt publishable key
    priceAmount: priceAmount, // Returnera priset i öre för användning i frontend
    formattedPrice: (priceAmount / 100).toFixed(2) // Formaterat pris i kronor med två decimaler
  });
} 