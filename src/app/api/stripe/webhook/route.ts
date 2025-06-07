import { NextRequest, NextResponse } from 'next/server';
import { constructEventFromPayload, isTestMode } from '@/lib/stripe';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';

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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Logga all metadata från Stripe-sessionen
      console.log("[Stripe Webhook] Mottagen session.metadata:", session.metadata);
      
      const { subdomain, handbookName, userId } = session.metadata || {};
      
      if (subdomain && handbookName) {
        // Use subdomain directly without test prefix for path-based routing
        const finalSubdomain = subdomain;
        
        console.log(`Creating handbook with name: ${handbookName}, subdomain: ${finalSubdomain}, userId: ${userId || 'null'}`);
        await createHandbookInSupabase(handbookName, finalSubdomain, userId || null);
      }
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
