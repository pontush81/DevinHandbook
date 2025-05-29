import { createCheckoutSession, isTestMode } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';

export async function POST(req: NextRequest) {
  try {
    console.log(`Stripe Checkout körs i ${isTestMode ? 'TESTLÄGE' : 'SKARPT LÄGE'}`);
    
    const requestData = await req.json();

    // Logga vad som tas emot från frontend
    console.log("[Stripe Checkout] Backend mottog requestData:", requestData);

    // Handle both formats: {handbookData: {...}} and direct {...}
    const handbookData = requestData.handbookData || requestData;

    const { name, subdomain, template, userId } = handbookData;

    // Om SKIP_STRIPE är true, skapa handbok direkt och returnera lyckat svar
    if (process.env.SKIP_STRIPE === 'true') {
      try {
        const handbookId = await createHandbookWithSectionsAndPages(name, subdomain, template, userId);
        console.log(`[SKIP_STRIPE] Handbok skapad direkt med id: ${handbookId}`);
        return new Response(JSON.stringify({ success: true, handbookId, message: 'Handbok skapad utan Stripe!' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[SKIP_STRIPE] Fel vid skapande av handbok:', error);
        return new Response(JSON.stringify({ success: false, message: 'Fel vid skapande av handbok', error: error?.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Logga vad som skickas vidare till Stripe
    console.log("[Stripe Checkout] Skickar till Stripe:", { name, subdomain, userId });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const session = await createCheckoutSession(
      name,
      subdomain,
      userId,
      `${origin}/success?session_id={CHECKOUT_SESSION_ID}&handbook_name=${encodeURIComponent(name)}&subdomain=${encodeURIComponent(subdomain)}`,
      `${origin}/create-handbook`
    );

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url,
      isTestMode
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
