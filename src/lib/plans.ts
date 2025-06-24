export interface PlanFeature {
  name: string;
  included: boolean;
  description?: string;
}

export interface PlanConfig {
  id: string;
  name: string;
  type: 'trial' | 'monthly' | 'annual' | 'lifetime' | 'free' | 'enterprise';
  price: number;
  currency: string;
  duration_days?: number;
  active: boolean;
  description: string;
  features: string[];
  stripe_price_id?: string;
  popular?: boolean;
  savings?: string;
}

// Central plan configuration
export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  trial: {
    id: 'trial',
    name: 'Gratisperiod',
    type: 'trial',
    price: 0,
    currency: 'kr',
    duration_days: 30,
    active: true,
    description: '30 dagar gratis för alla nya användare',
    features: [
      'Alla funktioner',
      'Obegränsade handböcker',
      'Obegränsade sidor',
      'Mobil-optimerad visning'
    ]
  },
  monthly: {
    id: 'monthly',
    name: 'Månadsprenumeration',
    type: 'monthly',
    price: 149,
    currency: 'kr',
    duration_days: 30,
    active: true,
    description: 'Betala månadsvis',
    features: [
      'Alla funktioner',
      'Obegränsade handböcker',
      'Obegränsade sidor',
      'Anpassade teman och färger',
      'Medarbetarinbjudningar',
      'Prioriterad support'
    ]
  },
  annual: {
    id: 'annual',
    name: 'Årsprenumeration',
    type: 'annual',
    price: 1490,
    currency: 'kr',
    duration_days: 365,
    active: true,
    popular: true,
    savings: 'Spara 20%',
    description: 'Betala årsvis - spara 20%!',
    features: [
      'Alla funktioner',
      'Obegränsade handböcker',
      'Obegränsade sidor',
      'Anpassade teman och färger',
      'Medarbetarinbjudningar',
      'Prioriterad support',
      'Spara 298 kr per år'
    ]
  },
  free: {
    id: 'free',
    name: 'Gratis',
    type: 'free',
    price: 0,
    currency: 'kr',
    active: false,
    description: 'Begränsad gratis version',
    features: [
      '1 handbok',
      'Begränsade sidor (max 10)',
      'Grundläggande teman',
      'Community support'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    type: 'enterprise',
    price: 0, // Custom pricing
    currency: 'kr',
    active: false,
    description: 'Anpassad lösning för stora organisationer',
    features: [
      'Obegränsade handböcker',
      'Obegränsade användare',
      'Anpassad integration',
      'Dedikerad support',
      'SLA-avtal',
      'Anpassad branding',
      'API-åtkomst'
    ]
  },
  lifetime: {
    id: 'lifetime',
    name: 'Livstid',
    type: 'lifetime',
    price: 0, // To be set
    currency: 'kr',
    active: false,
    description: 'Engångsbetalning för livstidsåtkomst',
    features: [
      'Alla funktioner',
      'Livstidsåtkomst',
      'Inga återkommande avgifter',
      'Prioriterad support',
      'Framtida funktioner inkluderade'
    ]
  }
} as const;

// Helper functions
export const getActivePlans = (): PlanConfig[] => {
  return Object.values(PLAN_CONFIGS).filter(plan => plan.active);
};

export const getPlanById = (id: string): PlanConfig | undefined => {
  return PLAN_CONFIGS[id];
};

export const getSubscriptionPlans = (): PlanConfig[] => {
  return Object.values(PLAN_CONFIGS).filter(plan => 
    plan.active && ['monthly', 'annual'].includes(plan.type)
  );
};

export const formatPlanPrice = (plan: PlanConfig): string => {
  if (plan.price === 0) return 'Gratis';
  
  const basePrice = `${plan.price} ${plan.currency}`;
  
  if (plan.duration_days === 30) return `${basePrice}/månad`;
  if (plan.duration_days === 365) return `${basePrice}/år`;
  if (plan.duration_days) return `${basePrice}/${plan.duration_days} dagar`;
  
  return basePrice;
};

export const getPlanMonthlyEquivalent = (plan: PlanConfig): number => {
  if (plan.duration_days === 365) {
    return Math.round(plan.price / 12);
  }
  return plan.price;
};

// Validation functions
export const isValidPlanType = (type: string): type is PlanConfig['type'] => {
  return ['trial', 'monthly', 'annual', 'lifetime', 'free', 'enterprise'].includes(type);
};

export const validatePlanConfig = (config: Partial<PlanConfig>): string[] => {
  const errors: string[] = [];
  
  if (!config.name?.trim()) {
    errors.push('Plan name is required');
  }
  
  if (!config.type || !isValidPlanType(config.type)) {
    errors.push('Valid plan type is required');
  }
  
  if (typeof config.price !== 'number' || config.price < 0) {
    errors.push('Price must be a non-negative number');
  }
  
  if (!config.currency?.trim()) {
    errors.push('Currency is required');
  }
  
  if (!config.description?.trim()) {
    errors.push('Description is required');
  }
  
  return errors;
};

// Database constraint types (must match database)
export const ALLOWED_PLAN_TYPES = [
  'trial',
  'monthly', 
  'annual',
  'lifetime',
  'free',
  'enterprise'
] as const;

export type AllowedPlanType = typeof ALLOWED_PLAN_TYPES[number]; 