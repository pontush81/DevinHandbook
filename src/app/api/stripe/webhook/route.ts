import { NextRequest, NextResponse } from 'next/server';
import { constructEventFromPayload, isTestMode } from '@/lib/stripe';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log(`Stripe Webhook körs i ${isTestMode ? 'TESTLÄGE' : 'SKARPT LÄGE'}`);
    
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    let event;
    try {
      event = await constructEventFromPayload(payload, signature);
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
    }

    // Hantera olika Stripe events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
        
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}

async function createHandbookInSupabase(name: string, subdomain: string, userId: string | null) {
  try {
    return await createHandbookWithSectionsAndPages(name, subdomain, userId);
  } catch (error: unknown) {
    console.error('Error creating handbook in Supabase:', error);
    throw error;
  }
}

async function handleCheckoutCompleted(session: any) {
  console.log("[Stripe Webhook] Handling checkout.session.completed");
  console.log("[Stripe Webhook] Session metadata:", session.metadata);
  
  const { subdomain, handbookName, userId, action, type } = session.metadata || {};
  
  // Hantera trial-uppgraderingar
  if (action === 'upgrade_from_trial' && type === 'subscription') {
    console.log(`[Stripe Webhook] Handling trial upgrade for user ${userId}`);
    await handleTrialUpgrade(userId, session);
    return;
  }
  
  // Hantera vanlig handbok-skapande
  if (subdomain && handbookName) {
    // Use subdomain directly without test prefix for path-based routing
    const finalSubdomain = subdomain;
    
    console.log(`Creating handbook with name: ${handbookName}, subdomain: ${finalSubdomain}, userId: ${userId || 'null'}`);
    const handbookResult = await createHandbookInSupabase(handbookName, finalSubdomain, userId || null);
    
    // Integrera med customer lifecycle efter lyckad betalning
    if (userId && handbookResult && handbookResult.id) {
      await integrateWithCustomerLifecycle(userId, handbookResult.id, session);
    }
  }
}

async function handlePaymentSucceeded(invoice: any) {
  console.log("[Stripe Webhook] Handling invoice.payment_succeeded");
  
  const supabase = getServiceSupabase();
  const customerId = invoice.customer;
  
  try {
    // Hitta subscription baserat på Stripe customer ID
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (error || !subscription) {
      console.log(`[Stripe Webhook] No subscription found for customer ${customerId}`);
      return;
    }
    
    // Uppdatera subscription med senaste betalning
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_payment_at: new Date().toISOString(),
        next_payment_due: new Date(invoice.lines.data[0].period.end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);
    
    if (updateError) {
      console.error('[Stripe Webhook] Error updating subscription:', updateError);
      return;
    }
    
    // Logga lifecycle event
    await supabase
      .from('customer_lifecycle_events')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        event_type: 'payment_succeeded',
        status: 'completed',
        automated_action: 'payment_processed',
        action_completed_at: new Date().toISOString(),
        metadata: {
          invoice_id: invoice.id,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency
        }
      });
    
    console.log(`[Stripe Webhook] Payment succeeded for subscription ${subscription.id}`);
    
  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log("[Stripe Webhook] Handling invoice.payment_failed");
  
  const supabase = getServiceSupabase();
  const customerId = invoice.customer;
  
  try {
    // Hitta subscription baserat på Stripe customer ID
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (error || !subscription) {
      console.log(`[Stripe Webhook] No subscription found for customer ${customerId}`);
      return;
    }
    
    // Schemalägga betalningspåminnelser via customer lifecycle
    await supabase
      .rpc('schedule_automated_action', {
        p_action_type: 'send_payment_reminder',
        p_user_id: subscription.user_id,
        p_priority: 3,
        p_metadata: {
          invoice_id: invoice.id,
          amount_due: invoice.amount_due,
          currency: invoice.currency,
          subscription_id: subscription.id
        }
      });
    
    // Logga lifecycle event
    await supabase
      .from('customer_lifecycle_events')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        event_type: 'payment_failed',
        status: 'completed',
        automated_action: 'payment_reminder_scheduled',
        action_completed_at: new Date().toISOString(),
        metadata: {
          invoice_id: invoice.id,
          amount_due: invoice.amount_due,
          currency: invoice.currency
        }
      });
    
    console.log(`[Stripe Webhook] Payment failed for subscription ${subscription.id}, reminders scheduled`);
    
  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment failed:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log("[Stripe Webhook] Handling customer.subscription.updated");
  
  const supabase = getServiceSupabase();
  
  try {
    // Uppdatera subscription i databasen
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          stripe_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end
        }
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (error) {
      console.error('[Stripe Webhook] Error updating subscription:', error);
      return;
    }
    
    console.log(`[Stripe Webhook] Subscription ${subscription.id} updated`);
    
  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  console.log("[Stripe Webhook] Handling customer.subscription.deleted");
  
  const supabase = getServiceSupabase();
  
  try {
    // Hitta subscription i databasen
    const { data: dbSubscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (error || !dbSubscription) {
      console.log(`[Stripe Webhook] No subscription found for Stripe subscription ${subscription.id}`);
      return;
    }
    
    // Uppdatera subscription status
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', dbSubscription.id);
    
    // Initiera customer offboarding
    await supabase
      .rpc('initiate_customer_offboarding', {
        p_user_id: dbSubscription.user_id,
        p_reason: 'subscription_cancelled'
      });
    
    console.log(`[Stripe Webhook] Subscription ${subscription.id} cancelled, offboarding initiated`);
    
  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription cancelled:', error);
  }
}

async function handleTrialUpgrade(userId: string, stripeSession: any) {
  console.log(`[Stripe Webhook] Handling trial upgrade for user ${userId}`);
  
  const supabase = getServiceSupabase();
  
  try {
    // Extrahera plan-typ från metadata
    const planType = stripeSession.metadata?.planType || 'monthly';
    const subscriptionId = stripeSession.subscription;
    const customerId = stripeSession.customer;
    
    console.log(`[Stripe Webhook] Trial upgrade details:`, {
      userId,
      planType,
      subscriptionId,
      customerId
    });

    // 1. Uppdatera trial-status till completed
    const { error: trialError } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'active',
        trial_used: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (trialError) {
      console.error('[Stripe Webhook] Error updating trial status:', trialError);
    }

    // 2. Skapa subscription record med rätt plan-typ
    const subscriptionData = {
      user_id: userId,
      plan_type: planType,
      status: 'active',
      started_at: new Date().toISOString(),
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      last_payment_at: new Date().toISOString(),
      auto_renewal: true,
      metadata: {
        stripe_session_id: stripeSession.id,
        payment_amount: stripeSession.amount_total,
        currency: stripeSession.currency,
        plan_type: planType,
        upgraded_from_trial: true
      }
    };

    // Sätt rätt datum baserat på plan-typ
    if (planType === 'yearly') {
      subscriptionData.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      subscriptionData.next_payment_due = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      subscriptionData.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      subscriptionData.next_payment_due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subError) {
      console.error('[Stripe Webhook] Error creating subscription:', subError);
      throw subError;
    }

    console.log(`[Stripe Webhook] Created ${planType} subscription: ${subscription.id}`);

    // 3. Uppdatera account status
    const { error: statusError } = await supabase
      .from('account_status')
      .upsert({
        user_id: userId,
        status: 'active',
        can_access_handbooks: true,
        can_create_handbooks: true,
        max_handbooks: 999, // Obergränsade handböcker
        suspended_at: null,
        scheduled_deletion_at: null,
        warning_sent_at: null,
        metadata: {
          subscription_id: subscription.id,
          activated_via: 'trial_upgrade',
          plan_type: planType,
          activation_date: new Date().toISOString()
        }
      }, { onConflict: 'user_id' });

    if (statusError) {
      console.error('[Stripe Webhook] Error updating account status:', statusError);
    }

    // 4. Logga lifecycle event
    await supabase
      .from('customer_lifecycle_events')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        event_type: 'trial_converted',
        status: 'completed',
        automated_action: 'subscription_activated',
        action_completed_at: new Date().toISOString(),
        metadata: {
          stripe_session_id: stripeSession.id,
          plan_type: planType,
          payment_amount: stripeSession.amount_total,
          currency: stripeSession.currency,
          converted_from: 'trial'
        }
      });

    console.log(`[Stripe Webhook] Trial upgrade completed successfully for user ${userId}`);

  } catch (error) {
    console.error('[Stripe Webhook] Error in trial upgrade:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log("[Stripe Webhook] Handling customer.subscription.created");
  // Detta kommer att hanteras av checkout.session.completed för vårt fall
}

async function integrateWithCustomerLifecycle(userId: string, handbookId: string, stripeSession: any) {
  const supabase = getServiceSupabase();
  
  try {
    console.log(`[Stripe Webhook] Integrating with customer lifecycle for user ${userId}`);
    
    // 1. Skapa subscription record
    const subscriptionData = {
      user_id: userId,
      handbook_id: handbookId,
      plan_type: 'basic', // Eller bestäm baserat på session
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 år
      stripe_subscription_id: stripeSession.subscription || null,
      stripe_customer_id: stripeSession.customer || null,
      last_payment_at: new Date().toISOString(),
      next_payment_due: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      auto_renewal: true,
      metadata: {
        stripe_session_id: stripeSession.id,
        payment_amount: stripeSession.amount_total,
        currency: stripeSession.currency
      }
    };
    
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (subError) {
      console.error('[Stripe Webhook] Error creating subscription:', subError);
      throw subError;
    }
    
    console.log(`[Stripe Webhook] Created subscription: ${subscription.id}`);
    
    // 2. Uppdatera account status
    const accountStatusData = {
      user_id: userId,
      status: 'active',
      can_access_handbooks: true,
      can_create_handbooks: true,
      max_handbooks: 10, // Eller baserat på plan
      suspended_at: null,
      scheduled_deletion_at: null,
      warning_sent_at: null,
      metadata: {
        subscription_id: subscription.id,
        activated_via: 'stripe_payment',
        activation_date: new Date().toISOString()
      }
    };
    
    const { error: statusError } = await supabase
      .from('account_status')
      .upsert(accountStatusData, { onConflict: 'user_id' });
    
    if (statusError) {
      console.error('[Stripe Webhook] Error updating account status:', statusError);
      throw statusError;
    }
    
    console.log(`[Stripe Webhook] Updated account status for user ${userId}`);
    
    // 3. Logga lifecycle event
    const lifecycleEventData = {
      user_id: userId,
      handbook_id: handbookId,
      subscription_id: subscription.id,
      event_type: 'subscription_created',
      status: 'completed',
      automated_action: 'stripe_payment_completed',
      action_completed_at: new Date().toISOString(),
      metadata: {
        stripe_session_id: stripeSession.id,
        payment_amount: stripeSession.amount_total,
        currency: stripeSession.currency,
        handbook_name: stripeSession.metadata?.handbookName,
        subdomain: stripeSession.metadata?.subdomain
      }
    };
    
    const { error: eventError } = await supabase
      .from('customer_lifecycle_events')
      .insert(lifecycleEventData);
    
    if (eventError) {
      console.error('[Stripe Webhook] Error logging lifecycle event:', eventError);
      // Inte kritiskt, logga bara felet
    }
    
    console.log(`[Stripe Webhook] Customer lifecycle integration completed for user ${userId}`);
    
  } catch (error) {
    console.error('[Stripe Webhook] Error in customer lifecycle integration:', error);
    // Kasta inte fel här - vi vill inte att webhook ska misslyckas
    // Handbok-skapandet har redan lyckats
  }
}
