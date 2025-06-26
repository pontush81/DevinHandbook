import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { checkoutSessionId } = await req.json();
    
    if (!checkoutSessionId) {
      return NextResponse.json({ error: 'checkoutSessionId required' }, { status: 400 });
    }

    console.log(`🧪 [Debug Webhook] Manually triggering webhook for session: ${checkoutSessionId}`);

    // Hämta checkout session från Stripe
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['line_items', 'subscription']
    });

    console.log(`📋 [Debug Webhook] Session details:`, {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      metadata: session.metadata,
      customer: session.customer,
      subscription: session.subscription
    });

    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Session not completed or payment not successful',
        session_status: session.status,
        payment_status: session.payment_status
      }, { status: 400 });
    }

    // Extrahera handbookId från metadata
    const handbookId = session.metadata?.handbookId;
    
    if (!handbookId) {
      return NextResponse.json({ 
        error: 'No handbookId in session metadata',
        metadata: session.metadata
      }, { status: 400 });
    }

    console.log(`📖 [Debug Webhook] Processing payment for handbook: ${handbookId}`);

    // Uppdatera handbook från trial till betald
    const supabase = getServiceSupabase();
    
    // Först, kontrollera handbokens nuvarande status
    const { data: handbook, error: fetchError } = await supabase
      .from('handbooks')
      .select('id, name, trial_end_date, user_id')
      .eq('id', handbookId)
      .single();

    if (fetchError || !handbook) {
      return NextResponse.json({ 
        error: 'Handbook not found',
        handbookId,
        error_details: fetchError
      }, { status: 404 });
    }

    console.log(`📚 [Debug Webhook] Current handbook status:`, {
      id: handbook.id,
      name: handbook.name,
      trial_end_date: handbook.trial_end_date,
      user_id: handbook.user_id
    });

    // Uppdatera handbook till betald status (sätt trial_end_date till null)
    const { error: updateError } = await supabase
      .from('handbooks')
      .update({ 
        trial_end_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', handbookId);

    if (updateError) {
      console.error(`❌ [Debug Webhook] Failed to update handbook:`, updateError);
      return NextResponse.json({ 
        error: 'Failed to update handbook',
        details: updateError
      }, { status: 500 });
    }

    // Skapa eller uppdatera prenumeration
    const subscriptionData = {
      user_id: handbook.user_id,
      handbook_id: handbookId,
      stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dagar
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'handbook_id'
      });

    if (subscriptionError) {
      console.error(`❌ [Debug Webhook] Failed to create/update subscription:`, subscriptionError);
      // Fortsätt ändå - handbok är uppdaterad
    }

    console.log(`✅ [Debug Webhook] Successfully processed payment for handbook ${handbookId}`);

    // Verifiera att uppdateringen fungerade
    const { data: updatedHandbook } = await supabase
      .from('handbooks')
      .select('id, name, trial_end_date')
      .eq('id', handbookId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Webhook logic executed successfully',
      handbook: {
        id: handbookId,
        name: handbook.name,
        previous_trial_end_date: handbook.trial_end_date,
        current_trial_end_date: updatedHandbook?.trial_end_date
      },
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer: session.customer,
        subscription: session.subscription
      }
    });

  } catch (error) {
    console.error('❌ [Debug Webhook] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 