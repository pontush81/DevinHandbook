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
          STRIPE_SECRET_KEY_TEST: !!process.env.STRIPE_SECRET_KEY_TEST,
          STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
          STRIPE_WEBHOOK_SECRET_TEST: !!process.env.STRIPE_WEBHOOK_SECRET_TEST,
          STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST,
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        },
        activeKeys: {
          secretKey: useTestKeys ? 'STRIPE_SECRET_KEY_TEST' : 'STRIPE_SECRET_KEY',
          webhookSecret: useTestKeys ? 'STRIPE_WEBHOOK_SECRET_TEST' : 'STRIPE_WEBHOOK_SECRET',
          publishableKey: useTestKeys ? 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST' : 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
        },
        keyValidation: {
          secretKeyExists: !!(useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY),
          secretKeyType: (() => {
            const key = useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY;
            if (!key) return 'MISSING';
            if (key.startsWith('sk_test_')) return 'TEST';
            if (key.startsWith('sk_live_')) return 'LIVE';
            return 'UNKNOWN';
          })(),
          webhookSecretExists: !!(useTestKeys ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET),
          webhookSecretLength: (useTestKeys ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET)?.length || 0
        }
      },
      
      pricing: {
        HANDBOOK_PRICE: process.env.HANDBOOK_PRICE,
        calculatedPrice: Number(process.env.HANDBOOK_PRICE) || (useTestKeys ? 1000 : 249000),
        priceInSEK: (Number(process.env.HANDBOOK_PRICE) || (useTestKeys ? 1000 : 249000)) / 100
      },
      
      urls: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        VERCEL_URL: process.env.VERCEL_URL
      },
      
      status: {
        stripeConfigured: !!(useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY),
        webhookConfigured: !!(useTestKeys ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET),
        environmentValid: isDevelopment || isStaging || isProduction,
        readyForPayments: !!(useTestKeys ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY) && 
                         !!(useTestKeys ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET)
      },
      
      debug: {
        timestamp: new Date().toISOString(),
        vercelRegion: process.env.VERCEL_REGION,
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