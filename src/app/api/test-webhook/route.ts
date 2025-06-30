import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTrialUpgrade } from '@/app/api/stripe/webhook/route';
import { requireDevOrStagingEnvironment, logSecurityEvent } from '@/lib/security-utils';

/**
 * Test-endpoint för att simulera Stripe webhook-anrop
 * Används för att testa betalningsflödet utan att behöva gå genom faktisk Stripe-betalning
 */
export async function POST(req: NextRequest) {
  // Säkerhetskontroll - endast tillgänglig i dev/staging
  const securityCheck = requireDevOrStagingEnvironment('test-webhook');
  if (securityCheck) {
    return securityCheck;
  }

  logSecurityEvent('test-webhook-access', { 
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString() 
  });

  try {
    console.log('🧪 [Test Webhook] Starting test webhook simulation...');
    
    const body = await req.json();
    const { userId, testType = 'trial_upgrade' } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required for test webhook' },
        { status: 400 }
      );
    }

    // Simulera olika typer av webhook-events
    switch (testType) {
      case 'trial_upgrade':
        console.log('🧪 [Test Webhook] Simulating trial upgrade for user:', userId);
        
        // Skapa mock Stripe session data
        const mockStripeSession = {
          id: `cs_test_${Date.now()}`,
          customer: `cus_test_${userId}`,
          mode: 'subscription',
          payment_status: 'paid',
          metadata: {
            handbook_name: 'Test Handbok',
            handbook_slug: `test-handbok-${Date.now()}`,
            user_id: userId
          }
        };

        await handleTrialUpgrade(userId, mockStripeSession);
        
        return NextResponse.json({
          success: true,
          message: 'Test trial upgrade webhook processed successfully',
          testType,
          userId,
          mockData: mockStripeSession
        });
        
      default:
        return NextResponse.json(
          { error: `Unknown test type: ${testType}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('🧪 [Test Webhook] Error:', error);
    return NextResponse.json(
      { 
        error: 'Test webhook failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 