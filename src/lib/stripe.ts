import Stripe from 'stripe';

/**
 * Väljer rätt Stripe-nyckel baserat på miljö
 * Produktionsnycklar används endast i produktionsmiljö, annars testnycklar
 */
const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
const stripeSecretKey = isProduction 
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY_TEST;

const stripeWebhookSecret = isProduction
  ? process.env.STRIPE_WEBHOOK_SECRET
  : process.env.STRIPE_WEBHOOK_SECRET_TEST;

// Exportera teststatus för användning i andra moduler
export const isTestMode = !isProduction;

/**
 * Stripe-instans som konfigureras baserat på miljö
 */
export const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2025-04-30.basil',
});

export const createCheckoutSession = async (
  handbookName: string,
  subdomain: string,
  successUrl: string,
  cancelUrl: string
) => {
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
          unit_amount: Number(process.env.HANDBOOK_PRICE) || 99500, // 995 SEK i öre
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
    },
  });
};

export const constructEventFromPayload = async (
  payload: string,
  signature: string,
  webhookSecret?: string
) => {
  // Använd rätt webhook-nyckel baserat på miljö
  return stripe.webhooks.constructEvent(
    payload, 
    signature, 
    webhookSecret || stripeWebhookSecret!
  );
};
