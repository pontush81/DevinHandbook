// Hämta pris från miljövariabel (i öre)
const getHandbookPrice = () => {
  const priceInOre = Number(process.env.NEXT_PUBLIC_HANDBOOK_PRICE || process.env.HANDBOOK_PRICE) || 249000;
  return Math.round(priceInOre / 100); // Konvertera från öre till kronor
};

// Dynamiska priser baserat på miljövariabel
export const PRICING = {
  PRO: {
    monthly: getHandbookPrice(), // Använd miljövariabel
    yearly: getHandbookPrice() * 10, // Om du vill ha årspris
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