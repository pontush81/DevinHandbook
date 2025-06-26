import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Miljödetektering
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
    const isStaging = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'preview';
    const useTestKeys = isDevelopment || isStaging;

    const envCheck = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        isDevelopment,
        isStaging, 
        isProduction,
        currentEnvironment: isDevelopment ? 'development' : isStaging ? 'staging' : 'production'
      },
      
      stripe: {
        usingTestKeys: useTestKeys,
        keysAvailable: {
          STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
          STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        },
        activeKeys: {
          secretKey: useTestKeys ? 'STRIPE_SECRET_KEY_TEST' : 'STRIPE_SECRET_KEY',
          webhookSecret: useTestKeys ? 'STRIPE_WEBHOOK_SECRET_TEST' : 'STRIPE_WEBHOOK_SECRET',
          publishableKey: useTestKeys ? 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST' : 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
        },
        keyValidation: {
          secretKeyExists: !!process.env.STRIPE_SECRET_KEY,
          secretKeyType: process.env.STRIPE_SECRET_KEY 
            ? (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TEST' : 'LIVE')
            : 'MISSING',
          webhookSecretExists: !!process.env.STRIPE_WEBHOOK_SECRET,
          webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length || 0
        }
      },
      
      pricing: {
        HANDBOOK_PRICE: process.env.HANDBOOK_PRICE || 'not set',
        NEXT_PUBLIC_HANDBOOK_PRICE: process.env.NEXT_PUBLIC_HANDBOOK_PRICE || 'not set',
        calculatedPrice: Number(process.env.HANDBOOK_PRICE) || 249000,
        priceInSEK: Math.round((Number(process.env.HANDBOOK_PRICE) || 249000) / 100)
      },
      
      urls: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
        VERCEL_URL: process.env.VERCEL_URL || 'not set'
      },
      
      status: {
        stripeConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        environmentValid: true,
        readyForPayments: !!(
          process.env.STRIPE_SECRET_KEY && 
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && 
          process.env.STRIPE_WEBHOOK_SECRET
        )
      },
      
      debug: {
        timestamp: new Date().toISOString(),
        vercelRegion: process.env.VERCEL_REGION || 'unknown',
        nodeVersion: process.version
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