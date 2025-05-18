import { isTestMode } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function GET() {
  // Hämta priset från miljövariabeln eller använd standardvärdet 300 öre (3 kr)
  const priceAmount = Number(process.env.HANDBOOK_PRICE) || 300;

  return NextResponse.json({ 
    isTestMode,
    environment: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    priceAmount: priceAmount, // Returnera priset i öre för användning i frontend
    formattedPrice: (priceAmount / 100).toFixed(2) // Formaterat pris i kronor med två decimaler
  });
} 