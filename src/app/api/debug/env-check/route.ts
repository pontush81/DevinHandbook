import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
    const forceTestMode = process.env.FORCE_STRIPE_TEST_MODE === 'true';
    const useTestKeys = !isProduction || forceTestMode;
    
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      isProduction,
      forceTestMode,
      useTestKeys,
      environmentVariables: {
        STRIPE_WEBHOOK_SECRET_TEST: !!process.env.STRIPE_WEBHOOK_SECRET_TEST,
        STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_SECRET_KEY_TEST: !!process.env.STRIPE_SECRET_KEY_TEST,
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        FORCE_STRIPE_TEST_MODE: process.env.FORCE_STRIPE_TEST_MODE
      },
      selectedWebhookSecret: {
        exists: !!(useTestKeys 
          ? (process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET)
          : process.env.STRIPE_WEBHOOK_SECRET),
        length: (useTestKeys 
          ? (process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET)
          : process.env.STRIPE_WEBHOOK_SECRET)?.length || 0,
        source: useTestKeys 
          ? (process.env.STRIPE_WEBHOOK_SECRET_TEST ? 'STRIPE_WEBHOOK_SECRET_TEST' : 'STRIPE_WEBHOOK_SECRET')
          : 'STRIPE_WEBHOOK_SECRET'
      }
    };
    
    return NextResponse.json(envCheck);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check environment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 