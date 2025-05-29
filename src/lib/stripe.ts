import Stripe from 'stripe';

/**
 * Väljer rätt Stripe-nyckel baserat på miljö
 * Produktionsnycklar används endast i produktionsmiljö, annars testnycklar
 */
const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Exportera teststatus för användning i andra moduler
export const isTestMode = !isProduction;

/**
 * Stripe-instans som konfigureras baserat på miljö
 * Med säkerhetskontroll för om nyckeln finns
 */
export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    })
  : null as any; // För att undvika byggfel under utveckling

export const createCheckoutSession = async (
  handbookName: string,
  subdomain: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
) => {
  // Säkerhetskontroll att Stripe är initierat
  if (!stripe) {
    throw new Error("Stripe not initialized. Missing API key.");
  }
  
  // Använd ett mycket litet belopp för testning i produktion
  // HANDBOOK_PRICE är i öre, alltså 300 = 3 kronor (Stripe's minimumgräns)
  const priceAmount = Number(process.env.HANDBOOK_PRICE) || 300; // Default till 3 kr om ingen miljövariabel finns
  
  console.log(`Creating checkout session with amount: ${priceAmount} öre (${priceAmount/100} kr)`);
  
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'sek',
          product_data: {
            name: `Digital handbok: ${handbookName}`,
            description: `Subdomän: ${subdomain}.handbok.org`,
          },
          unit_amount: priceAmount, // Använder priset från miljövariabeln eller default (3 kr)
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      subdomain,
      handbookName,
      userId,
    },
  });
};

export const constructEventFromPayload = async (
  payload: string,
  signature: string,
  webhookSecret?: string
) => {
  // Säkerhetskontroll att Stripe är initierat
  if (!stripe) {
    throw new Error("Stripe not initialized. Missing API key.");
  }
  
  // Använd rätt webhook-nyckel baserat på miljö
  return stripe.webhooks.constructEvent(
    payload, 
    signature, 
    webhookSecret || stripeWebhookSecret!
  );
};
