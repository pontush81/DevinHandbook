import { NextRequest, NextResponse } from 'next/server';
import { constructEventFromPayload, isTestMode } from '@/lib/stripe';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';
import { getServiceSupabase } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

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
async function logWebhookResult({ success, eventType, eventId, processingTimeMs, error }: {
  success: boolean;
  eventType: string;
  eventId: string;
  processingTimeMs: number;
  error?: string;
}) {
  try {
    const supabase = getServiceSupabase();
    
    const logEntry = {
      event_id: eventId,
      event_type: eventType,
      success: success,
      processing_time_ms: processingTimeMs,
      processed_at: new Date().toISOString(),
      error_message: error || undefined,
      environment: process.env.NODE_ENV || 'unknown'
    };

    console.log(`📊 [Webhook Log] Recording result:`, logEntry);

    // Try to insert into webhook_logs table if it exists
    const { error: logError } = await supabase
      .from('webhook_processing_logs')
      .insert(logEntry);

    if (logError) {
      console.warn(`⚠️ [Webhook Log] Could not save to database (table may not exist):`, logError.message);
      // Don't throw error - this is just logging
    } else {
      console.log(`✅ [Webhook Log] Successfully recorded webhook result`);
    }

  } catch (error) {
    console.warn(`⚠️ [Webhook Log] Failed to log webhook result:`, error);
    // Don't throw error - this is just logging
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
  
  console.log('🎯 [Stripe Webhook] === WEBHOOK CALL RECEIVED ===');
  console.log('🎯 [Stripe Webhook] Request method:', req.method);
  console.log('🎯 [Stripe Webhook] Request URL:', req.url);
  console.log('🎯 [Stripe Webhook] Request headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    console.log('🎯 [Stripe Webhook] Body length:', body.length);
    console.log('🎯 [Stripe Webhook] Signature present:', !!signature);
    console.log('🎯 [Stripe Webhook] Signature value:', signature ? signature.substring(0, 50) + '...' : 'MISSING');
    
    if (!signature) {
      console.error('❌ [Stripe Webhook] No Stripe signature found');
      return NextResponse.json({ error: 'No Stripe signature' }, { status: 400 });
    }

    console.log('🔐 [Stripe Webhook] Attempting to construct event from payload...');
    
    let event;
    try {
      event = await constructEventFromPayload(body, signature);
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
          
        case 'checkout.session.expired':
          console.log(`⏰ [Stripe Webhook] Processing checkout.session.expired`);
          await retryOperation(
            () => handleCheckoutExpired(event.data.object),
            'handleCheckoutExpired'
          );
          break;
          
        case 'customer.created':
          console.log(`👤 [Stripe Webhook] Processing customer.created`);
          // Just log for now, no specific action needed
          console.log(`✅ [Stripe Webhook] Customer created: ${event.data.object.id}`);
          break;
          
        case 'customer.updated':
          console.log(`👤 [Stripe Webhook] Processing customer.updated`);
          // Just log for now, no specific action needed
          console.log(`✅ [Stripe Webhook] Customer updated: ${event.data.object.id}`);
          break;
          
        case 'payment_method.attached':
          console.log(`💳 [Stripe Webhook] Processing payment_method.attached`);
          // Just log for now, no specific action needed
          console.log(`✅ [Stripe Webhook] Payment method attached: ${event.data.object.id}`);
          break;
          
        case 'payment_intent.created':
        case 'payment_intent.succeeded':
        case 'charge.succeeded':
        case 'invoice.created':
        case 'invoice.finalized':
        case 'invoice.paid':
          console.log(`📋 [Stripe Webhook] Processing ${event.type}`);
          // These events are informational, no specific action needed
          console.log(`✅ [Stripe Webhook] Event ${event.type} processed (informational only)`);
          break;
          
        default:
          console.log(`⚠️ [Stripe Webhook] Unhandled event type: ${event.type}`);
          console.log(`ℹ️ [Stripe Webhook] This event type is not configured for processing, but webhook completed successfully`);
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
  console.log("[Stripe Webhook] Full session object keys:", Object.keys(session));
  console.log("[Stripe Webhook] Session ID:", session.id);
  console.log("[Stripe Webhook] Session payment_status:", session.payment_status);
  console.log("[Stripe Webhook] Session mode:", session.mode);
  console.log("[Stripe Webhook] Session customer:", session.customer);
  console.log("[Stripe Webhook] Session subscription:", session.subscription);
  
  const { subdomain, handbookName, userId, action, type, handbookId, planType } = session.metadata || {};
  
  console.log("[Stripe Webhook] Extracted metadata values:", {
    subdomain,
    handbookName,
    userId,
    action,
    type,
    handbookId,
    planType
  });
  
  // FÖRBÄTTRING: Hantera trial-uppgraderingar även utan metadata
  const isTrialUpgrade = (action === 'upgrade_from_trial' && type === 'subscription') || 
                        (session.mode === 'subscription' && session.subscription && !subdomain && !handbookName);
  
  if (isTrialUpgrade) {
    console.log(`[Stripe Webhook] Detected trial upgrade (metadata: ${!!action}, fallback: ${!action})`);
    
    let finalUserId = userId;
    let finalHandbookId = handbookId;
    
    // Om vi har userId från metadata, använd det
    if (userId) {
      console.log(`[Stripe Webhook] Using userId from metadata: ${userId}`);
    } else {
      // FALLBACK: Om metadata saknas, försök hitta userId via Stripe customer
      if (session.customer) {
        console.log(`[Stripe Webhook] No userId in metadata, searching via customer: ${session.customer}`);
        
        const supabase = getServiceSupabase();
        
        // Försök hitta användaren via tidigare subscriptions med samma customer ID
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', session.customer)
          .limit(1)
          .single();
        
        if (existingSubscription) {
          console.log(`[Stripe Webhook] Found userId via existing subscription: ${existingSubscription.user_id}`);
          finalUserId = existingSubscription.user_id;
        } else {
          // SISTA UTVÄG: Försök hitta via Stripe customer email
          try {
            if (stripe) {
              const customer = await stripe.customers.retrieve(session.customer);
              if (customer && !customer.deleted && customer.email) {
                console.log(`[Stripe Webhook] Found customer email: ${customer.email}`);
                
                const { data: userProfile } = await supabase
                  .from('user_profiles')
                  .select('id')
                  .eq('email', customer.email)
                  .limit(1)
                  .single();
                
                if (userProfile) {
                  console.log(`[Stripe Webhook] Found userId via email: ${userProfile.id}`);
                  finalUserId = userProfile.id;
                }
              }
            }
          } catch (error) {
            console.error(`[Stripe Webhook] Error retrieving customer from Stripe:`, error);
          }
        }
      }
    }
    
    // Om vi fortfarande inte har userId, kan vi inte fortsätta
    if (!finalUserId) {
      console.error(`[Stripe Webhook] Could not determine userId for trial upgrade - session: ${session.id}`);
      return;
    }
    
    // Om handbookId saknas, försök hitta den senaste trial-handboken för användaren
    if (!finalHandbookId) {
      console.log(`[Stripe Webhook] No handbookId in metadata, searching for user's trial handbook`);
      
      const supabase = getServiceSupabase();
      
      // Hitta den senaste handboken som fortfarande är i trial för denna användare
      const { data: trialHandbooks } = await supabase
        .from('handbooks')
        .select('id, title, created_at')
        .eq('owner_id', finalUserId)
        .not('trial_end_date', 'is', null) // Fortfarande i trial
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (trialHandbooks && trialHandbooks.length > 0) {
                 finalHandbookId = trialHandbooks[0].id;
         console.log(`[Stripe Webhook] Found trial handbook: ${finalHandbookId} (${trialHandbooks[0].title})`);
       } else {
         console.log(`[Stripe Webhook] No trial handbooks found for user ${finalUserId}`);
         // Vi kan fortfarande skapa en allmän subscription utan specifik handbook
       }
     }
     
     // Skapa en modifierad session med komplett metadata för handleTrialUpgrade
     const enhancedSession = {
       ...session,
       metadata: {
         ...session.metadata,
         userId: finalUserId,
         handbookId: finalHandbookId || undefined,
         action: 'upgrade_from_trial',
         type: 'subscription',
         planType: planType || 'yearly', // Default till yearly om det saknas
         webhook_enhanced: true // Flagga att vi har förbättrat metadata
       }
     };
    
    console.log(`[Stripe Webhook] Enhanced session metadata:`, enhancedSession.metadata);
    
    await handleTrialUpgrade(finalUserId, enhancedSession);
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
  
  console.log("[Stripe Webhook] checkout.session.completed processing finished");
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
    // Säker hantering av datum - kontrollera att current_period_end finns och är giltigt
    let expiresAt = null;
    if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      try {
        expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
      } catch (dateError) {
        console.warn('[Stripe Webhook] Invalid current_period_end, setting expires_at to null:', subscription.current_period_end);
        expiresAt = null;
      }
    }

    // Uppdatera subscription i databasen
    const updateData = {
      status: subscription.status,
      updated_at: new Date().toISOString(),
      metadata: {
        stripe_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end
      }
    };

    // Lägg bara till expires_at om vi har ett giltigt datum
    if (expiresAt) {
      updateData.expires_at = expiresAt;
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('stripe_subscription_id', subscription.id);
    
    if (error) {
      console.error('[Stripe Webhook] Error updating subscription:', error);
      return;
    }
    
    console.log(`[Stripe Webhook] Subscription ${subscription.id} updated - Status: ${subscription.status}, Cancel at period end: ${subscription.cancel_at_period_end}`);
    
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
  console.log(`[Stripe Webhook] === HANDLING TRIAL UPGRADE ===`);
  console.log(`[Stripe Webhook] User ID: ${userId}`);
  console.log(`[Stripe Webhook] Session ID: ${stripeSession.id}`);
  console.log(`[Stripe Webhook] Session metadata:`, stripeSession.metadata);
  console.log(`[Stripe Webhook] Session customer:`, stripeSession.customer);
  console.log(`[Stripe Webhook] Session subscription:`, stripeSession.subscription);

  const supabase = getServiceSupabase();
  
  try {
    // Extract metadata with fallbacks
    let handbookId = stripeSession.metadata?.handbookId;
    let planType = stripeSession.metadata?.planType || 'yearly'; // Default to yearly
    
    console.log(`[Stripe Webhook] Initial metadata - handbookId: ${handbookId}, planType: ${planType}`);
    
    // ROBUST FALLBACK 1: If no handbookId in metadata, find user's most recent trial handbook
    if (!handbookId) {
      console.log(`[Stripe Webhook] No handbookId in metadata, searching for user's trial handbooks...`);
      
      const { data: trialHandbooks, error: searchError } = await supabase
        .from('handbooks')
        .select('id, title, created_at, trial_end_date')
        .eq('owner_id', userId)
        .not('trial_end_date', 'is', null) // Still in trial
        .order('created_at', { ascending: false })
        .limit(5); // Get last 5 to be safe
      
      if (searchError) {
        console.error(`[Stripe Webhook] Error searching for trial handbooks:`, searchError);
      } else if (trialHandbooks && trialHandbooks.length > 0) {
        // Take the most recent one
        handbookId = trialHandbooks[0].id;
        console.log(`[Stripe Webhook] FALLBACK: Found ${trialHandbooks.length} trial handbooks, using most recent: ${handbookId} (${trialHandbooks[0].title})`);
        
        // Log all found handbooks for debugging
        trialHandbooks.forEach((hb, idx) => {
          console.log(`[Stripe Webhook] Trial handbook ${idx + 1}: ${hb.id} - ${hb.title} (created: ${hb.created_at})`);
        });
      } else {
        console.log(`[Stripe Webhook] FALLBACK: No trial handbooks found for user ${userId}`);
      }
    }
    
    // ROBUST FALLBACK 2: If still no handbookId, check if this user has ANY handbooks at all
    if (!handbookId) {
      console.log(`[Stripe Webhook] Still no handbookId, checking for ANY user handbooks...`);
      
      const { data: anyHandbooks, error: anyError } = await supabase
        .from('handbooks')
        .select('id, title, created_at, trial_end_date')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (anyError) {
        console.error(`[Stripe Webhook] Error searching for any handbooks:`, anyError);
      } else if (anyHandbooks && anyHandbooks.length > 0) {
        console.log(`[Stripe Webhook] Found ${anyHandbooks.length} total handbooks for user:`);
        anyHandbooks.forEach((hb, idx) => {
          console.log(`[Stripe Webhook] Handbook ${idx + 1}: ${hb.id} - ${hb.title} (trial_end_date: ${hb.trial_end_date})`);
        });
        
        // If any of them still has trial_end_date, use that one
        const stillInTrial = anyHandbooks.find(hb => hb.trial_end_date !== null);
        if (stillInTrial) {
          handbookId = stillInTrial.id;
          console.log(`[Stripe Webhook] FALLBACK 2: Using handbook still in trial: ${handbookId} (${stillInTrial.title})`);
        } else {
          console.log(`[Stripe Webhook] FALLBACK 2: All handbooks already paid, will create general subscription`);
        }
      } else {
        console.log(`[Stripe Webhook] FALLBACK 2: User has no handbooks at all - this is unusual for trial upgrade`);
      }
    }

    // Get Stripe subscription and customer info
    const subscriptionId = stripeSession.subscription;
    const customerId = stripeSession.customer;
    
    console.log(`[Stripe Webhook] Stripe IDs - subscription: ${subscriptionId}, customer: ${customerId}`);

    // STEP 1: Mark handbook as paid (if we have a handbookId)
    if (handbookId) {
      console.log(`[Stripe Webhook] Step 1: Marking handbook ${handbookId} as paid...`);
      
      try {
        const { markHandbookAsPaid } = await import('@/lib/handbook-status');
        await markHandbookAsPaid(handbookId);
        console.log(`✅ [Stripe Webhook] Successfully marked handbook ${handbookId} as paid`);
        
        // Verify the update worked
        const { data: verifyHandbook } = await supabase
          .from('handbooks')
          .select('id, title, trial_end_date')
          .eq('id', handbookId)
          .single();
        
        if (verifyHandbook?.trial_end_date === null) {
          console.log(`✅ [Stripe Webhook] VERIFIED: Handbook "${verifyHandbook.title}" is now marked as PAID`);
        } else {
          console.error(`❌ [Stripe Webhook] VERIFICATION FAILED: Handbook still has trial_end_date: ${verifyHandbook?.trial_end_date}`);
        }
        
      } catch (error) {
        console.error(`❌ [Stripe Webhook] Error marking handbook as paid:`, error);
        // Continue anyway to create subscription
      }
    } else {
      console.log(`⚠️ [Stripe Webhook] Step 1 SKIPPED: No handbookId found - will create general subscription`);
    }

    // STEP 2: Create subscription record
    console.log(`[Stripe Webhook] Step 2: Creating subscription record...`);
    
    const dbPlanType = planType === 'yearly' ? 'annual' : 'monthly';
    const subscriptionData = {
      user_id: userId,
      handbook_id: handbookId || null,
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
        handbook_id: handbookId || null,
        fallback_used: !stripeSession.metadata?.handbookId,
        webhook_enhanced: !!stripeSession.metadata?.webhook_enhanced
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

    console.log(`✅ [Stripe Webhook] Created ${planType} subscription: ${subscription.id}`);

    // STEP 3: Update account status
    console.log(`[Stripe Webhook] Step 3: Updating account status...`);
    
    const { error: statusError } = await supabase
      .from('account_status')
      .upsert({
        user_id: userId,
        status: 'active',
        can_access_handbooks: true,
        can_create_handbooks: true,
        max_handbooks: 999,
        suspended_at: null,
        scheduled_deletion_at: null,
        updated_at: new Date().toISOString(),
        metadata: {
          subscription_id: subscription.id,
          activated_via: 'trial_upgrade',
          plan_type: dbPlanType,
          original_plan_type: planType,
          activation_date: new Date().toISOString(),
          handbook_id: handbookId || null,
          fallback_used: !stripeSession.metadata?.handbookId,
          webhook_enhanced: !!stripeSession.metadata?.webhook_enhanced
        }
      }, { onConflict: 'user_id' });

    if (statusError) {
      console.error('[Stripe Webhook] Error updating account status:', statusError);
    } else {
      console.log(`✅ [Stripe Webhook] Updated account status for user ${userId}`);
    }

    // STEP 4: Log lifecycle event
    console.log(`[Stripe Webhook] Step 4: Logging lifecycle event...`);
    
    const { error: lifecycleError } = await supabase
      .from('customer_lifecycle_events')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        event_type: 'subscription_created',
        status: 'completed',
        automated_action: 'subscription_created',
        action_completed_at: new Date().toISOString(),
        metadata: {
          stripe_session_id: stripeSession.id,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          plan_type: dbPlanType,
          original_plan_type: planType,
          handbook_id: handbookId || null,
          amount_paid: stripeSession.amount_total,
          currency: stripeSession.currency,
          fallback_used: !stripeSession.metadata?.handbookId,
          webhook_enhanced: !!stripeSession.metadata?.webhook_enhanced,
          event_context: 'trial_to_paid_upgrade'
        }
      });

    if (lifecycleError) {
      console.error('[Stripe Webhook] Error logging lifecycle event:', lifecycleError);
    } else {
      console.log(`✅ [Stripe Webhook] Logged lifecycle event`);
    }

    console.log(`🎉 [Stripe Webhook] === TRIAL UPGRADE COMPLETED SUCCESSFULLY ===`);
    console.log(`🎉 [Stripe Webhook] Summary:`);
    console.log(`🎉 [Stripe Webhook] - User: ${userId}`);
    console.log(`🎉 [Stripe Webhook] - Handbook: ${handbookId || 'NONE (general subscription)'}`);
    console.log(`🎉 [Stripe Webhook] - Plan: ${planType} (${dbPlanType})`);
    console.log(`🎉 [Stripe Webhook] - Subscription: ${subscription.id}`);
    console.log(`🎉 [Stripe Webhook] - Fallback used: ${!stripeSession.metadata?.handbookId}`);

  } catch (error) {
    console.error(`❌ [Stripe Webhook] TRIAL UPGRADE FAILED:`, error);
    throw error;
  }
}

async function handleCheckoutExpired(session: any) {
  console.log(`⏰ [Checkout Expired] Session expired: ${session.id}`);
  console.log(`ℹ️ [Checkout Expired] Customer did not complete payment within the time limit`);
  
  // Optional: Log expired sessions for analytics
  const supabase = getServiceSupabase();
  try {
    await supabase
      .from('checkout_sessions')
      .insert({
        stripe_session_id: session.id,
        status: 'expired',
        expired_at: new Date().toISOString(),
        metadata: session.metadata || {}
      });
  } catch (error) {
    console.error('❌ [Checkout Expired] Failed to log expired session:', error);
  }
  
  console.log(`✅ [Checkout Expired] Session ${session.id} processed successfully`);
}

async function handleSubscriptionCreated(subscription: any) {
  console.log(`📝 [Subscription Created] Processing subscription: ${subscription.id}`);
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
