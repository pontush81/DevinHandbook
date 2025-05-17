import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  const origin = request.headers.get('origin') || 'unknown';
  
  // Samla in information om miljön
  const diagnosticInfo = {
    timestamp: new Date().toISOString(),
    request: {
      host,
      path: url.pathname,
      userAgent,
      referer,
      origin,
      headers: Object.fromEntries(
        [...request.headers.entries()].map(([key, value]) => [key, value])
      )
    },
    environment: {
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown'
    },
    deploymentUrl: 'devin-handbook.vercel.app',
    testDomain: 'test.handbok.org',
    productionDomain: 'handbok.org',
    // Lägg in information om Stripe-läge
    stripe: {
      mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'production',
      testModeActive: process.env.STRIPE_SECRET_KEY_TEST ? true : false
    }
  };

  return NextResponse.json(diagnosticInfo, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 