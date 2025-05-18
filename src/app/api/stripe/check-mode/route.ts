import { isTestMode } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    isTestMode,
    environment: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'unknown'
  });
} 