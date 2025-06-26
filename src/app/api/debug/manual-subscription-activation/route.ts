import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { userId, handbookId, stripeCustomerEmail } = await req.json();
    
    console.log('🔧 [Manual Activation] Starting manual subscription activation:', {
      userId,
      handbookId, 
      stripeCustomerEmail
    });

    if (!userId || !handbookId) {
      return NextResponse.json({ 
        error: 'Missing userId or handbookId' 
      }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Skapa subscription record
    const subscriptionData = {
      user_id: userId,
      handbook_id: handbookId,
      plan_type: 'monthly',
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dagar
      stripe_customer_id: stripeCustomerEmail || null,
      last_payment_at: new Date().toISOString(),
      auto_renewal: true,
      metadata: {
        manual_activation: true,
        activation_reason: 'webhook_failed',
        payment_amount: 300, // 3 kr
        currency: 'sek'
      }
    };

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subError) {
      console.error('❌ [Manual Activation] Error creating subscription:', subError);
      return NextResponse.json({ 
        error: 'Failed to create subscription', 
        details: subError.message 
      }, { status: 500 });
    }

    console.log('✅ [Manual Activation] Created subscription:', subscription.id);

    // 2. Uppdatera handbook som betald
    const { error: handbookError } = await supabase
      .from('handbooks')
      .update({
        is_paid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', handbookId)
      .eq('owner_id', userId);

    if (handbookError) {
      console.error('❌ [Manual Activation] Error updating handbook:', handbookError);
    } else {
      console.log('✅ [Manual Activation] Updated handbook as paid');
    }

    return NextResponse.json({
      success: true,
      subscription: subscription,
      message: 'Subscription manually activated successfully'
    });

  } catch (error: any) {
    console.error('🚨 [Manual Activation] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 