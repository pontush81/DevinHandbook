export const PRICING = {
  PRO: {
    monthly: 149,
    yearly: 1490,
    currency: 'kr'
  }
} as const;

export const formatPrice = (amount: number, currency: string = 'kr', period?: string) => {
  const formatted = `${amount} ${currency}`;
  return period ? `${formatted}/${period}` : formatted;
};

export const getProPricing = () => ({
  monthly: formatPrice(PRICING.PRO.monthly, PRICING.PRO.currency, 'månad'),
  yearly: formatPrice(PRICING.PRO.yearly, PRICING.PRO.currency, 'år'),
  monthlyRaw: PRICING.PRO.monthly,
  yearlyRaw: PRICING.PRO.yearly
}); 