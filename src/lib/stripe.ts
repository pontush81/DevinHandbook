import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
          unit_amount: Number(process.env.HANDBOOK_PRICE) || 99500, // 995 SEK in öre
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
  webhookSecret: string
) => {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};
