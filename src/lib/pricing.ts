// Hämta årligt pris från miljövariabel (i öre)
const getYearlyPriceInOre = () => {
  return Number(process.env.NEXT_PUBLIC_HANDBOOK_PRICE || process.env.HANDBOOK_PRICE) || 149000;
};

const getYearlyPrice = () => {
  return Math.round(getYearlyPriceInOre() / 100); // Konvertera från öre till kronor
};

const getMonthlyPrice = () => {
  return Math.round(getYearlyPrice() / 10); // 149 kr/månad (1490/10)
};

// Dynamiska priser baserat på miljövariabel
export const PRICING = {
  PRO: {
    monthly: getMonthlyPrice(), // 149 kr/månad
    yearly: getYearlyPrice(), // 1490 kr/år
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