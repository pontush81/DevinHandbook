import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';
import { handleTrialUpgrade } from '@/app/api/stripe/webhook/route';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, handbookId } = await req.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    console.log(`[Payment Verification] Verifying payment for session ${sessionId}`);

    // Hämta session-status från Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        status: session.payment_status,
        message: 'Payment not completed'
      });
    }

    console.log(`[Payment Verification] Payment confirmed for session ${sessionId}`);

    // Om handbookId finns, kontrollera om webhook redan har bearbetat betalningen
    if (handbookId) {
      const supabase = getServiceSupabase();
      
      const { data: handbook } = await supabase
        .from('handbooks')
        .select('trial_end_date')
        .eq('id', handbookId)
        .single();
      
      // Om handboken fortfarande har trial_end_date (inte null) betyder det att webhook misslyckades
      if (handbook && handbook.trial_end_date !== null) {
        console.log(`[Payment Verification] Webhook appears to have failed for handbook ${handbookId}, processing payment now`);
        
        // Kör webhook-logiken manuellt
        await handleTrialUpgrade(userId, session);
        
        console.log(`[Payment Verification] Successfully processed payment for handbook ${handbookId}`);
        
        return NextResponse.json({
          success: true,
          status: 'processed',
          message: 'Payment processed successfully (webhook fallback)',
          handbookId
        });
      } else {
        console.log(`[Payment Verification] Webhook already processed payment for handbook ${handbookId}`);
        
        return NextResponse.json({
          success: true,
          status: 'already_processed',
          message: 'Payment already processed by webhook',
          handbookId
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: 'verified',
      message: 'Payment verified successfully'
    });

  } catch (error: any) {
    console.error('[Payment Verification] Error verifying payment:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to verify payment' 
      },
      { status: 500 }
    );
  }
} 