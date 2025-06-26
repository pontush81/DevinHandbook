import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';
import { handleTrialUpgrade } from '@/app/api/stripe/webhook/route';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, handbookId } = await req.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing sessionId or userId' },
        { status: 400 }
      );
    }

    console.log('🔧 [Auto-Fix] Starting automatic webhook repair for:', { sessionId, userId, handbookId });

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Step 1: Get the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Payment not completed',
        status: session.payment_status
      });
    }

    console.log('🔧 [Auto-Fix] Payment confirmed, checking if webhook already processed...');

    // Step 2: Check if webhook was already processed successfully
    const supabase = getServiceSupabase();
    
    // Check if subscription already exists for this session
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, user_id, handbook_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingSubscription && existingSubscription.length > 0) {
      console.log('🔧 [Auto-Fix] Active subscription already exists:', existingSubscription[0]);
      
      // Check if handbook is already paid (if handbookId provided)
      if (handbookId) {
        const { data: handbook } = await supabase
          .from('handbooks')
          .select('trial_end_date, title')
          .eq('id', handbookId)
          .single();
        
        if (handbook?.trial_end_date === null) {
          console.log('🔧 [Auto-Fix] Handbook already marked as paid, no repair needed');
          return NextResponse.json({
            success: true,
            status: 'already_processed',
            message: 'Payment already processed successfully'
          });
        } else {
          console.log('🔧 [Auto-Fix] Subscription exists but handbook still in trial - fixing handbook only');
          
          // Just fix the handbook
          const { markHandbookAsPaid } = await import('@/lib/handbook-status');
          await markHandbookAsPaid(handbookId);
          
          return NextResponse.json({
            success: true,
            status: 'handbook_fixed',
            message: 'Handbook trial status fixed'
          });
        }
      } else {
        return NextResponse.json({
          success: true,
          status: 'already_processed',
          message: 'Payment already processed successfully'
        });
      }
    }

    console.log('🔧 [Auto-Fix] No active subscription found, webhook likely failed - running repair...');

    // Step 3: Create enhanced session with complete metadata for webhook repair
    const enhancedSession = {
      ...session,
      metadata: {
        ...session.metadata,
        userId: userId,
        handbookId: handbookId || undefined,
        action: 'upgrade_from_trial',
        type: 'subscription',
        planType: session.metadata?.planType || 'yearly',
        auto_fix_applied: true,
        original_session_id: sessionId
      }
    };

    console.log('🔧 [Auto-Fix] Enhanced session metadata:', enhancedSession.metadata);

    // Step 4: Run the webhook logic
    await handleTrialUpgrade(userId, enhancedSession);

    console.log('✅ [Auto-Fix] Webhook repair completed successfully');

    return NextResponse.json({
      success: true,
      status: 'repaired',
      message: 'Webhook failure repaired successfully',
      sessionId: sessionId,
      userId: userId,
      handbookId: handbookId || null
    });

  } catch (error) {
    console.error('❌ [Auto-Fix] Webhook repair failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Webhook repair failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 