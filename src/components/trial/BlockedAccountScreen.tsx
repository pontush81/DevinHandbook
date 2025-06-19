"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, CreditCard } from 'lucide-react';

interface BlockedAccountScreenProps {
  trialEndedAt: string;
  handbookName?: string;
  onUpgrade?: (planType: 'monthly' | 'yearly') => Promise<void>;
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
      price: 149,
      period: '/månad',
      description: 'Betala månadsvis',
      badge: null
    },
    yearly: {
      price: 1490,
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
                All din information sparas säkert och återställs direkt när du uppgraderar.
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
                    <div className="text-xl font-bold text-gray-900">149 kr</div>
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
                  Förbereder uppgradering...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Uppgradera nu - {pricing[selectedPlan].price} kr{pricing[selectedPlan].period}
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