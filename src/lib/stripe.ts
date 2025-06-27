import Stripe from 'stripe';

/**
 * Miljöbaserad Stripe-konfiguration
 * - Development: Använder alltid test-nycklar
 * - Staging: Använder test-nycklar med riktiga webhooks  
 * - Production: Använder live-nycklar
 */

// Bestäm miljö
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'preview';

// Välj rätt nycklar baserat på miljö
const useTestKeys = isDevelopment || isStaging;

console.log(`[Stripe Config] Environment: ${process.env.NODE_ENV}, Vercel: ${process.env.VERCEL_ENV}`);
console.log(`[Stripe Config] isDevelopment: ${isDevelopment}, isStaging: ${isStaging}, isProduction: ${isProduction}`);
console.log(`[Stripe Config] Using: ${useTestKeys ? 'TEST' : 'LIVE'} keys`);

// Använd samma variabelnamn - Vercel hanterar environments
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Debug logging
console.log(`[Stripe Config] Secret key exists: ${!!stripeSecretKey}, Key type: ${stripeSecretKey ? (stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE') : 'MISSING'}`);
console.log(`[Stripe Config] Webhook secret exists: ${!!stripeWebhookSecret}, Length: ${stripeWebhookSecret ? stripeWebhookSecret.length : 0}`);

// Validation
if (!stripeSecretKey) {
  console.error(`[Stripe Config] Missing STRIPE_SECRET_KEY for environment: ${currentEnvironment}`);
}

if (!stripeWebhookSecret) {
  console.error(`[Stripe Config] Missing STRIPE_WEBHOOK_SECRET for environment: ${currentEnvironment}`);
}

// Exportera teststatus för användning i andra moduler
export const isTestMode = useTestKeys;
export const currentEnvironment = isDevelopment ? 'development' : isStaging ? 'staging' : 'production';

/**
 * Stripe-instans som konfigureras baserat på miljö
 */
export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    })
  : null as any;

export const createCheckoutSession = async (
  handbookName: string,
  subdomain: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
) => {
  if (!stripe) {
    throw new Error("Stripe not initialized. Missing API key.");
  }
  
  // Miljöbaserat pris
  const priceAmount = Number(process.env.HANDBOOK_PRICE) || (useTestKeys ? 1000 : 149000); // 10 kr test, 1490 kr prod
  
  console.log(`[Stripe] Creating checkout session - Amount: ${priceAmount} öre (${priceAmount/100} kr), Environment: ${currentEnvironment}`);
  
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'sek',
          product_data: {
            name: `Digital handbok: ${handbookName}`,
            description: `URL: handbok.org/${subdomain}`,
          },
          unit_amount: priceAmount,
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
  if (!stripe) {
    throw new Error("Stripe not initialized. Missing API key.");
  }
  
  return stripe.webhooks.constructEvent(
    payload, 
    signature, 
    webhookSecret || stripeWebhookSecret!
  );
};
