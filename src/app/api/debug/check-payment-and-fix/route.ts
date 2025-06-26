import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30',
});

export async function POST(req: NextRequest) {
  try {
    const { handbookId, userId } = await req.json();
    
    if (!handbookId || !userId) {
      return NextResponse.json({ error: 'handbookId and userId required' }, { status: 400 });
    }
    
    console.log(`🔍 [Payment Check] Checking payment status for handbook ${handbookId}, user ${userId}`);
    
    const supabase = getServiceSupabase();
    
    // 1. Get current handbook status
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, trial_end_date, user_id')
      .eq('id', handbookId)
      .single();
    
    if (handbookError || !handbook) {
      return NextResponse.json({ error: 'Handbook not found' }, { status: 404 });
    }
    
    console.log(`📖 [Payment Check] Handbook status: trial_end_date = ${handbook.trial_end_date}`);
    
    // 2. Check if user has any active subscriptions in Stripe
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();
    
    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // 3. Search for active subscriptions in Stripe
    let hasActiveSubscription = false;
    let subscriptionDetails = null;
    
    if (userProfile.stripe_customer_id) {
      console.log(`🔍 [Payment Check] Checking Stripe subscriptions for customer ${userProfile.stripe_customer_id}`);
      
      const subscriptions = await stripe.subscriptions.list({
        customer: userProfile.stripe_customer_id,
        status: 'active',
        limit: 10
      });
      
      console.log(`📊 [Payment Check] Found ${subscriptions.data.length} active subscriptions`);
      
      if (subscriptions.data.length > 0) {
        hasActiveSubscription = true;
        subscriptionDetails = subscriptions.data[0];
        console.log(`✅ [Payment Check] Active subscription found: ${subscriptionDetails.id}`);
      }
    }
    
    // 4. Also check recent successful payments
    let hasRecentPayment = false;
    let paymentDetails = null;
    
    if (userProfile.stripe_customer_id) {
      const charges = await stripe.charges.list({
        customer: userProfile.stripe_customer_id,
        limit: 5
      });
      
      const recentSuccessfulCharges = charges.data.filter(charge => 
        charge.status === 'succeeded' && 
        charge.created > (Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
      );
      
      if (recentSuccessfulCharges.length > 0) {
        hasRecentPayment = true;
        paymentDetails = recentSuccessfulCharges[0];
        console.log(`💳 [Payment Check] Recent payment found: ${paymentDetails.id}`);
      }
    }
    
    // 5. Check checkout sessions for this handbook
    let hasSuccessfulCheckout = false;
    let checkoutDetails = null;
    
    if (userProfile.stripe_customer_id) {
      const sessions = await stripe.checkout.sessions.list({
        customer: userProfile.stripe_customer_id,
        limit: 10
      });
      
      const handbookSessions = sessions.data.filter(session => 
        session.metadata?.handbookId === handbookId &&
        session.payment_status === 'paid'
      );
      
      if (handbookSessions.length > 0) {
        hasSuccessfulCheckout = true;
        checkoutDetails = handbookSessions[0];
        console.log(`🛒 [Payment Check] Successful checkout found: ${checkoutDetails.id}`);
      }
    }
    
    // 6. Determine if handbook should be paid
    const shouldBePaid = hasActiveSubscription || hasRecentPayment || hasSuccessfulCheckout;
    const currentlyInTrial = handbook.trial_end_date !== null;
    
    console.log(`📊 [Payment Check] Analysis:`, {
      shouldBePaid,
      currentlyInTrial,
      hasActiveSubscription,
      hasRecentPayment,
      hasSuccessfulCheckout
    });
    
    // 7. Fix if needed
    let fixed = false;
    if (shouldBePaid && currentlyInTrial) {
      console.log(`🔧 [Payment Check] Handbook should be paid but is in trial - fixing...`);
      
      const { markHandbookAsPaid } = await import('@/lib/handbook-status');
      await markHandbookAsPaid(handbookId);
      
      fixed = true;
      console.log(`✅ [Payment Check] Fixed handbook ${handbookId} - set to paid status`);
    }
    
    return NextResponse.json({
      handbookId,
      userId,
      currentStatus: currentlyInTrial ? 'trial' : 'paid',
      shouldBePaid,
      fixed,
      analysis: {
        hasActiveSubscription,
        hasRecentPayment,
        hasSuccessfulCheckout,
        subscriptionId: subscriptionDetails?.id,
        paymentId: paymentDetails?.id,
        checkoutId: checkoutDetails?.id
      }
    });
    
  } catch (error) {
    console.error('❌ [Payment Check] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 