"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, CreditCard, Gift, Star } from 'lucide-react';
import { getProPricing, PRICING } from '@/lib/pricing';

interface BlockedAccountScreenProps {
  trialEndedAt: string;
  handbookName?: string;
  onUpgrade?: (planType: 'monthly' | 'yearly') => Promise<void>;
  isUpgrading?: boolean;
}

interface EarlyUpgradeScreenProps {
  trialDaysRemaining: number;
  trialEndsAt: string;
  handbookName: string;
  onUpgrade: (planType: 'monthly' | 'yearly') => void;
  isUpgrading?: boolean;
}

export function BlockedAccountScreen({ 
  trialEndedAt, 
  handbookName,
  onUpgrade,
  isUpgrading = false
}: BlockedAccountScreenProps) {
  const router = useRouter();
  const [showFeatures, setShowFeatures] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const features = [
    "Obegränsade handböcker",
    "Obegränsade sidor per handbok", 
    "Anpassade teman och färger",
    "Medarbetarinbjudningar",
    "Mobil-optimerad visning",
    "SEO-optimering",
    "Anpassad URL (handbok.org/dittnamn)",
    "Prioriterad support"
  ];

  const handleUpgrade = async () => {
    if (onUpgrade) {
      await onUpgrade(selectedPlan);
    }
  };

  const pricing = {
    monthly: {
      price: PRICING.PRO.monthly,
      period: '/månad',
      description: 'Betala månadsvis',
      badge: null
    },
    yearly: {
      price: PRICING.PRO.yearly,
      period: '/år',
      description: 'Betala årsvis',
      badge: 'Spara 20%!'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8 text-center">
            {/* Status icon */}
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Trial-perioden har slutat
            </h1>
            
            {/* Trial end date */}
            <p className="text-gray-600 mb-6">
              Din 30 dagar gratis trial slutade {formatDate(trialEndedAt)}
            </p>

            {/* Data safety assurance */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Dina data är säkra</span>
              </div>
              <p className="text-sm text-green-700">
                All din information sparas säkert och återställs direkt när du aktiverar din prenumeration.
              </p>
            </div>

            {/* Plan selection */}
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Välj din plan:</h3>
              
              {/* Monthly plan */}
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPlan === 'monthly' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Månadsbetalning</div>
                    <div className="text-sm text-gray-600">Betala månadsvis</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{PRICING.PRO.monthly} kr</div>
                    <div className="text-sm text-gray-500">/månad</div>
                  </div>
                </div>
              </div>

              {/* Yearly plan */}
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all relative ${
                  selectedPlan === 'yearly' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan('yearly')}
              >
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                  Spara 20%!
                </Badge>
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Årsbetalning</div>
                    <div className="text-sm text-gray-600">Betala årsvis (2 månader gratis)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">1490 kr</div>
                    <div className="text-sm text-gray-500">/år</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features toggle */}
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 transition-colors"
            >
              {showFeatures ? 'Dölj funktioner' : 'Visa alla funktioner'}
            </button>

            {/* Features list */}
            {showFeatures && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="grid grid-cols-1 gap-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upgrade button */}
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3 transition-all duration-200"
            >
              {isUpgrading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Förbereder betalning...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Aktivera prenumeration - {pricing[selectedPlan].price} kr{pricing[selectedPlan].period}
                </>
              )}
            </Button>

            {/* Additional info */}
            <p className="text-xs text-gray-500 mt-4">
              Säker betalning via Stripe • Avsluta när som helst
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function EarlyUpgradeScreen({ 
  trialDaysRemaining,
  trialEndsAt, 
  handbookName,
  onUpgrade,
  isUpgrading = false
}: EarlyUpgradeScreenProps) {
  const pricing = getProPricing();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8 text-center">
            {/* Status icon */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Gift className="h-8 w-8 text-green-600" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Aktivera prenumeration tidigt och spara
            </h1>
            
            {/* Trial status */}
            <p className="text-gray-600 mb-2">
              Du har {trialDaysRemaining} dagar kvar av din gratis trial
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Trial slutar {formatDate(trialEndsAt)}
            </p>

            {/* Benefits of upgrading early */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Fördelar med tidig aktivering</span>
              </div>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>• Säker tillgång till alla funktioner</li>
                <li>• Inga avbrott när trial slutar</li>
                <li>• Stöd utvecklingen av plattformen</li>
                <li>• Prioriterad support</li>
              </ul>
            </div>

            {/* Plan selection */}
            <div className="space-y-3 mb-6">
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Välj din plan:</h3>
                
                {/* Yearly plan - recommended */}
                <button
                  onClick={() => onUpgrade('yearly')}
                  disabled={isUpgrading}
                  className="w-full p-4 border-2 border-green-300 rounded-lg hover:border-green-400 transition-colors mb-3 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-900">Årlig betalning</span>
                        <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                          Rekommenderas
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {pricing.yearly} - Spara {pricing.yearlySavings}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{pricing.yearlyMonthly}</div>
                      <div className="text-xs text-gray-500">per månad</div>
                    </div>
                  </div>
                </button>

                {/* Monthly plan */}
                <button
                  onClick={() => onUpgrade('monthly')}
                  disabled={isUpgrading}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <span className="font-semibold text-gray-900">Månadsvis betalning</span>
                      <div className="text-sm text-gray-600">Flexibel betalning</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{pricing.monthly}</div>
                      <div className="text-xs text-gray-500">per månad</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Security note */}
            <p className="text-xs text-gray-500 mb-4">
              Säker betalning via Stripe. Avbryt när som helst.
            </p>

            {/* Loading state */}
            {isUpgrading && (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-600">Förbereder betalning...</span>
              </div>
            )}

            {/* Continue with trial option */}
            <div className="pt-4 border-t border-gray-100">
              <button 
                onClick={() => window.history.back()}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Fortsätt med trial ({trialDaysRemaining} dagar kvar)
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 