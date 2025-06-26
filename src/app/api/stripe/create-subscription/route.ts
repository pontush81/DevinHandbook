import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, handbookId, planType, successUrl, cancelUrl } = await req.json();

    console.log(`[Stripe Subscription] Received request data:`, {
      userId,
      handbookId,
      handbookIdType: typeof handbookId,
      planType,
      successUrl,
      cancelUrl
    });

    if (!userId || !planType || !successUrl || !cancelUrl) {
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

    // Ny prissättning
    const pricing = {
      monthly: {
        amount: 14900, // 149 kr i öre
        interval: 'month' as const,
        name: 'Handbok.org - Månadsprenumeration',
        description: 'Digital handbok för din förening med full funktionalitet'
      },
      yearly: {
        amount: 149000, // 1490 kr i öre  
        interval: 'year' as const,
        name: 'Handbok.org - Årsprenumeration',
        description: 'Digital handbok för din förening med full funktionalitet (spara 20%!)'
      }
    };

    const selectedPlan = pricing[planType as keyof typeof pricing];
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan type. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    console.log(`[Stripe Subscription] Creating ${planType} subscription for user ${userId}${handbookId ? ` and handbook ${handbookId}` : ''}`);

    // Prepare metadata
    const metadata: { [key: string]: string } = {
      userId,
      action: 'upgrade_from_trial',
      type: 'subscription',
      planType: planType
    };

    // Add handbookId only if it's a valid string
    if (handbookId && typeof handbookId === 'string' && handbookId.trim() !== '') {
      metadata.handbookId = handbookId.trim();
    }

    console.log(`[Stripe Subscription] Session metadata:`, metadata);

    // Skapa Stripe checkout session för prenumeration
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.amount,
            recurring: {
              interval: selectedPlan.interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
      // Automatisk insamling av skatteuppgifter
      automatic_tax: {
        enabled: false, // Sätter till false för enkelhets skull
      },
      // Kunduppgifter - customer skapas automatiskt i subscription mode
      billing_address_collection: 'required'
    });

    console.log(`[Stripe Subscription] Created ${planType} session: ${session.id}`);
    console.log(`[Stripe Subscription] Session metadata verification:`, session.metadata);
    console.log(`[Stripe Subscription] Session customer:`, session.customer);
    console.log(`[Stripe Subscription] Session subscription:`, session.subscription);

    // KRITISK FÖRBÄTTRING: Skapa en fallback-timer för att kontrollera betalningsstatus
    // Detta säkerställer att handboken markeras som betald även om webhook misslyckas
    if (handbookId) {
      console.log(`[Stripe Subscription] Setting up fallback payment verification for handbook ${handbookId}`);
      
      // Skapa en bakgrundsprocess som kontrollerar betalningsstatus efter 5 minuter
      // Detta är tillräckligt tid för webhook att komma fram, men inte för lång för användaren
      setTimeout(async () => {
        try {
          console.log(`[Fallback Check] Checking payment status for session ${session.id}`);
          
          // Hämta session-status från Stripe
          const updatedSession = await stripe.checkout.sessions.retrieve(session.id);
          
          if (updatedSession.payment_status === 'paid') {
            console.log(`[Fallback Check] Payment confirmed for session ${session.id}, checking if webhook processed it`);
            
            // Kontrollera om handboken fortfarande är i trial-läge
            const { getServiceSupabase } = await import('@/lib/supabase');
            const supabase = getServiceSupabase();
            
            const { data: handbook } = await supabase
              .from('handbooks')
              .select('trial_end_date')
              .eq('id', handbookId)
              .single();
            
            // Om handboken fortfarande har trial_end_date (inte null) betyder det att webhook misslyckades
            if (handbook && handbook.trial_end_date !== null) {
              console.log(`[Fallback Check] Webhook appears to have failed for handbook ${handbookId}, executing fallback payment processing`);
              
              // Kör webhook-logiken manuellt
              const { handleTrialUpgrade } = await import('@/app/api/stripe/webhook/route');
              await handleTrialUpgrade(userId, updatedSession);
              
              console.log(`[Fallback Check] Successfully processed fallback payment for handbook ${handbookId}`);
            } else {
              console.log(`[Fallback Check] Webhook already processed payment for handbook ${handbookId}`);
            }
          } else {
            console.log(`[Fallback Check] Payment not completed for session ${session.id}, status: ${updatedSession.payment_status}`);
          }
        } catch (error) {
          console.error(`[Fallback Check] Error in fallback payment verification:`, error);
        }
      }, 5 * 60 * 1000); // 5 minuter delay
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      planType: planType,
      amount: selectedPlan.amount,
      interval: selectedPlan.interval
    });

  } catch (error: any) {
    console.error('[Stripe Subscription] Error creating subscription:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create subscription session' 
      },
      { status: 500 }
    );
  }
} 