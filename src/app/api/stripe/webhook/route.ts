import { NextRequest, NextResponse } from 'next/server';
import { constructEventFromPayload } from '@/lib/stripe';
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
        await createHandbookInSupabase(handbookName, subdomain);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}

async function createHandbookInSupabase(name: string, subdomain: string) {
  try {
    const defaultTemplate = {
      sections: [
        {
          id: "welcome",
          title: "Välkommen till föreningen",
          description: "Information om föreningen och området",
          order: 0,
          isActive: true,
          pages: [
            {
              id: "welcome-page",
              title: "Välkommen",
              content: "# Välkommen till föreningen\n\nHär hittar du all information du behöver som boende.",
              order: 0
            }
          ]
        }
      ]
    };
    
    return await createHandbookWithSectionsAndPages(name, subdomain, defaultTemplate);
  } catch (error: unknown) {
    console.error('Error creating handbook in Supabase:', error);
    throw error;
  }
}
