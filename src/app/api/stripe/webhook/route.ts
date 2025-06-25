import { NextRequest, NextResponse } from 'next/server';
import { constructEventFromPayload, isTestMode } from '@/lib/stripe';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';
import { getServiceSupabase } from '@/lib/supabase';

// Webhook processing status tracking
interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  eventId: string;
  processingTimeMs: number;
  error?: string;
  retryCount?: number;
}

// Log webhook processing results for monitoring
async function logWebhookResult(result: WebhookProcessingResult) {
  const supabase = getServiceSupabase();
  
  try {
    await supabase
      .from('webhook_processing_logs')
      .insert({
        event_type: result.eventType,
        event_id: result.eventId,
        success: result.success,
        processing_time_ms: result.processingTimeMs,
        error_message: result.error,
        retry_count: result.retryCount || 0,
        processed_at: new Date().toISOString(),
        test_mode: isTestMode
      });
  } catch (error) {
    console.error('❌ [Webhook Logging] Failed to log webhook result:', error);
  }
}

// Enhanced retry logic for critical operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Retry Logic] ${operationName} - Attempt ${attempt}/${maxRetries}`);
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ [Retry Logic] ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ [Retry Logic] ${operationName} failed on attempt ${attempt}:`, error);
      
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ [Retry Logic] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let eventType = 'unknown';
  let eventId = 'unknown';
  
  try {
    console.log(`🎯 [Stripe Webhook] Starting webhook processing in ${isTestMode ? 'TESTLÄGE' : 'SKARPT LÄGE'}`);
    
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    console.log(`📦 [Stripe Webhook] Payload length: ${payload.length}, Signature: ${signature ? 'Present' : 'Missing'}`);

    if (!signature) {
      console.error('❌ [Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event;
    try {
      event = await constructEventFromPayload(payload, signature);
      eventType = event.type;
      eventId = event.id;
      console.log(`✅ [Stripe Webhook] Event verified successfully: ${event.type} (ID: ${event.id})`);
    } catch (err) {
      console.error('❌ [Stripe Webhook] Signature verification failed:', err);
      
      // Log failed verification attempt
      await logWebhookResult({
        success: false,
        eventType: 'signature_verification_failed',
        eventId: 'unknown',
        processingTimeMs: Date.now() - startTime,
        error: `Signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
      
      return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
    }

    // Check for duplicate event processing
    const supabase = getServiceSupabase();
    const { data: existingLog } = await supabase
      .from('webhook_processing_logs')
      .select('id, success')
      .eq('event_id', eventId)
      .eq('success', true)
      .limit(1);

    if (existingLog && existingLog.length > 0) {
      console.log(`⚠️ [Stripe Webhook] Event ${eventId} already processed successfully, skipping`);
      return NextResponse.json({ 
        received: true, 
        eventType: event.type, 
        processed: false, 
        reason: 'already_processed' 
      });
    }

    // Hantera olika Stripe events med retry logic
    console.log(`🔄 [Stripe Webhook] Processing event type: ${event.type}`);
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log(`💳 [Stripe Webhook] Processing checkout.session.completed`);
          await retryOperation(
            () => handleCheckoutCompleted(event.data.object),
            'handleCheckoutCompleted'
          );
          break;
          
        case 'invoice.payment_succeeded':
          console.log(`💰 [Stripe Webhook] Processing invoice.payment_succeeded`);
          await retryOperation(
            () => handlePaymentSucceeded(event.data.object),
            'handlePaymentSucceeded'
          );
          break;
          
        case 'invoice.payment_failed':
          console.log(`❌ [Stripe Webhook] Processing invoice.payment_failed`);
          await retryOperation(
            () => handlePaymentFailed(event.data.object),
            'handlePaymentFailed'
          );
          break;
          
        case 'customer.subscription.created':
          console.log(`📝 [Stripe Webhook] Processing customer.subscription.created`);
          await retryOperation(
            () => handleSubscriptionCreated(event.data.object),
            'handleSubscriptionCreated'
          );
          break;
          
        case 'customer.subscription.updated':
          console.log(`🔄 [Stripe Webhook] Processing customer.subscription.updated`);
          await retryOperation(
            () => handleSubscriptionUpdated(event.data.object),
            'handleSubscriptionUpdated'
          );
          break;
          
        case 'customer.subscription.deleted':
          console.log(`🗑️ [Stripe Webhook] Processing customer.subscription.deleted`);
          await retryOperation(
            () => handleSubscriptionCancelled(event.data.object),
            'handleSubscriptionCancelled'
          );
          break;
          
        default:
          console.log(`⚠️ [Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ [Stripe Webhook] Event ${event.type} processed successfully in ${processingTime}ms`);
      
      // Log successful processing
      await logWebhookResult({
        success: true,
        eventType: event.type,
        eventId: event.id,
        processingTimeMs: processingTime
      });
      
      return NextResponse.json({ 
        received: true, 
        eventType: event.type, 
        processed: true,
        processingTimeMs: processingTime
      });
      
    } catch (processingError) {
      console.error(`❌ [Stripe Webhook] Error processing ${event.type}:`, processingError);
      
      // Log processing failure
      await logWebhookResult({
        success: false,
        eventType: event.type,
        eventId: event.id,
        processingTimeMs: Date.now() - startTime,
        error: processingError instanceof Error ? processingError.message : 'Unknown processing error'
      });
      
      // Return 500 to trigger Stripe's retry mechanism
      return NextResponse.json({ 
        error: 'Event processing failed', 
        eventType: event.type,
        eventId: event.id 
      }, { status: 500 });
    }
    
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [Stripe Webhook] Critical webhook handler error:', error);
    
    // Log critical failure
    await logWebhookResult({
      success: false,
      eventType,
      eventId,
      processingTimeMs: processingTime,
      error: `Critical webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    
    return NextResponse.json({ 
      error: 'Webhook handler failed', 
      eventType,
      eventId 
    }, { status: 500 });
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

export async function handleTrialUpgrade(userId: string, stripeSession: any) {
  console.log(`🔄 [Stripe Webhook] Handling trial upgrade for user ${userId}`);
  
  const supabase = getServiceSupabase();
  
  try {
    // Extrahera plan-typ och handbook ID från metadata
    const planType = stripeSession.metadata?.planType || 'monthly';
    const handbookId = stripeSession.metadata?.handbookId;
    const subscriptionId = stripeSession.subscription;
    const customerId = stripeSession.customer;
    
    console.log(`📊 [Stripe Webhook] Trial upgrade details:`, {
      userId,
      handbookId,
      planType,
      subscriptionId,
      customerId,
      sessionId: stripeSession.id,
      amountTotal: stripeSession.amount_total,
      currency: stripeSession.currency
    });

    if (!handbookId) {
      throw new Error('Missing handbookId in session metadata - cannot process trial upgrade');
    }

    // 1. Uppdatera trial-status till completed med retry logic
    console.log(`🔄 [Stripe Webhook] Updating user profile for user ${userId}`);
    await retryOperation(async () => {
      const { error: trialError } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'active',
          trial_used: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (trialError) {
        throw new Error(`Failed to update user profile: ${trialError.message}`);
      }
    }, `Update user profile for ${userId}`);

    // 2. KRITISK: Uppdatera handbok prenumeration - detta är huvudproblemet
    console.log(`🎯 [Stripe Webhook] CRITICAL: Updating handbook ${handbookId} to paid status`);
    
    await retryOperation(async () => {
      // Först, verifiera att handboken finns
      const { data: handbook, error: fetchError } = await supabase
        .from('handbooks')
        .select('id, title, trial_end_date')
        .eq('id', handbookId)
        .single();

      if (fetchError || !handbook) {
        throw new Error(`Handbook ${handbookId} not found: ${fetchError?.message || 'Unknown error'}`);
      }

      console.log(`📖 [Stripe Webhook] Found handbook: ${handbook.title} (current trial_end_date: ${handbook.trial_end_date})`);
      
      // Sätt handbokens trial_end_date till null för att aktivera prenumeration
      const { error: handbookError } = await supabase
        .from('handbooks')
        .update({
          trial_end_date: null, // null = aktiv prenumeration
          updated_at: new Date().toISOString()
        })
        .eq('id', handbookId);

      if (handbookError) {
        throw new Error(`Failed to update handbook trial status: ${handbookError.message}`);
      }

      // Verifiera att uppdateringen lyckades
      const { data: updatedHandbook, error: verifyError } = await supabase
        .from('handbooks')
        .select('trial_end_date')
        .eq('id', handbookId)
        .single();

      if (verifyError) {
        throw new Error(`Failed to verify handbook update: ${verifyError.message}`);
      }

      if (updatedHandbook.trial_end_date !== null) {
        throw new Error(`Handbook update verification failed: trial_end_date is still ${updatedHandbook.trial_end_date}`);
      }

      console.log(`✅ [Stripe Webhook] Successfully activated subscription for handbook ${handbookId}`);
    }, `Update handbook ${handbookId} to paid status`, 5, 2000); // More retries and longer delay for critical operation

    // 3. Skapa subscription record med rätt plan-typ
    // Konvertera planType till databas-kompatibelt format
    const dbPlanType = planType === 'yearly' ? 'annual' : 'monthly';
    const subscriptionData = {
      user_id: userId,
      handbook_id: handbookId || null, // Lägg till handbook_id om det finns
      plan_type: dbPlanType,
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
        plan_type: dbPlanType,
        original_plan_type: planType,
        upgraded_from_trial: true,
        handbook_id: handbookId || null
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

    // 4. Uppdatera account status
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
          plan_type: dbPlanType,
          original_plan_type: planType,
          activation_date: new Date().toISOString()
        }
      }, { onConflict: 'user_id' });

    if (statusError) {
      console.error('[Stripe Webhook] Error updating account status:', statusError);
    }

    // 5. Logga lifecycle event
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
          plan_type: dbPlanType,
          original_plan_type: planType,
          payment_amount: stripeSession.amount_total,
          currency: stripeSession.currency,
          converted_from: 'trial',
          handbook_id: handbookId || null
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
