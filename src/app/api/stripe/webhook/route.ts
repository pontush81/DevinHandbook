import { NextRequest, NextResponse } from 'next/server';
import { constructEventFromPayload } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    let event;
    try {
      event = await constructEventFromPayload(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const { subdomain, handbookName } = session.metadata || {};
      
      if (subdomain && handbookName) {
        await createHandbookInSupabase(handbookName, subdomain, session.customer as string);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}

async function createHandbookInSupabase(name: string, subdomain: string, customerId: string) {
  const supabase = getServiceSupabase();
  
  try {
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .insert({
        name,
        subdomain,
        published: true,
      })
      .select()
      .single();

    if (handbookError) throw handbookError;
    
    
    
    return handbook.id;
  } catch (error) {
    console.error('Error creating handbook in Supabase:', error);
    throw error;
  }
}
