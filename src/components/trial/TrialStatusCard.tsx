import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, Star, AlertTriangle } from 'lucide-react';
import { getTrialStatus, formatTrialEndDate, isTrialExpired } from '@/lib/trial-service';
import type { TrialStatus } from '@/lib/trial-service';
import { getProPricing } from '@/lib/pricing';

interface TrialStatusCardProps {
  userId: string;
  className?: string;
}

export function TrialStatusCard({ userId, className = '' }: TrialStatusCardProps) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pricing = getProPricing();

  useEffect(() => {
    async function fetchTrialStatus() {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        const status = await getTrialStatus(userId);
        setTrialStatus(status);
      } catch (err) {
        console.error('Error fetching trial status:', err);
        setError('Kunde inte hämta trial-status');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrialStatus();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className={`border-0 shadow-md ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Laddar trial-status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Only hide on real errors, not just missing data
    console.warn('TrialStatusCard error:', error);
    return null;
  }
  
  if (!trialStatus) {
    // Show a minimal placeholder instead of hiding completely
    return (
      <Card className={`border-0 shadow-sm bg-blue-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center text-blue-600">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
            <span className="text-sm">Kontrollerar prenumerationsstatus...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only hide if user explicitly has no trial and no subscription
  if (!trialStatus.isInTrial && !trialStatus.hasUsedTrial && trialStatus.subscriptionStatus === 'none') {
    return null;
  }

  const isExpired = trialStatus.trialEndsAt ? isTrialExpired(trialStatus.trialEndsAt) : false;
  const isExpiringSoon = trialStatus.trialDaysRemaining <= 3 && trialStatus.trialDaysRemaining > 0;

  // Aktiv trial
  if (trialStatus.isInTrial && !isExpired) {
    return (
      <Card className={`border-0 shadow-md bg-gradient-to-r from-green-50 to-blue-50 border-green-200 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Gift className="mr-2 h-5 w-5 text-green-600" />
              Gratis Trial Aktiv
            </CardTitle>
            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
              {trialStatus.trialDaysRemaining} dagar kvar
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="mr-2 h-4 w-4" />
              Trial slutar: {formatTrialEndDate(trialStatus.trialEndsAt)}
            </div>
            
            {isExpiringSoon && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center text-yellow-800">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span className="font-medium">Trial slutar snart!</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Din gratis period slutar om {trialStatus.trialDaysRemaining} dag{trialStatus.trialDaysRemaining !== 1 ? 'ar' : ''}. 
                  Uppgradera nu för att fortsätta använda din handbok.
                </p>
              </div>
            )}
            
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Vad ingår i din trial:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-green-500" />
                  Full tillgång till alla funktioner
                </li>
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-green-500" />
                  Obegränsad redigering av innehåll
                </li>
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-green-500" />
                  Medlemshantering
                </li>
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-green-500" />
                  Publicering på webben
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                Uppgradera nu ({pricing.yearly})
              </Button>
              <Button variant="outline" className="flex-1">
                Läs mer om Pro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Trial har gått ut
  if (trialStatus.hasUsedTrial && isExpired) {
    return (
      <Card className={`border-0 shadow-md bg-gradient-to-r from-red-50 to-orange-50 border-red-200 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
              Trial har gått ut
            </CardTitle>
            <Badge variant="destructive">
              Utgången
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <p className="text-gray-600">
              Din 30 dagars gratis trial gick ut {formatTrialEndDate(trialStatus.trialEndsAt)}. 
              För att fortsätta använda din handbok behöver du uppgradera till vårt Pro-konto.
            </p>
            
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Med Pro-kontot får du:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-blue-500" />
                  Obegränsad tillgång till alla funktioner
                </li>
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-blue-500" />
                  Skapa flera handböcker
                </li>
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-blue-500" />
                  Prioriterad support
                </li>
                <li className="flex items-center">
                  <Star className="mr-2 h-3 w-3 text-blue-500" />
                  Avancerade anpassningsmöjligheter
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                Uppgradera nu ({pricing.yearly})
              </Button>
              <Button variant="outline" className="flex-1">
                Kontakta support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aktiv prenumeration
  if (trialStatus.subscriptionStatus === 'active') {
    return (
      <Card className={`border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Star className="mr-2 h-5 w-5 text-blue-600" />
              Pro-konto Aktivt
            </CardTitle>
            <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              Aktiv
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-gray-600 mb-4">
            Tack för att du använder vårt Pro-konto! Du har full tillgång till alla funktioner.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1">
              Hantera prenumeration
            </Button>
            <Button variant="outline" className="flex-1">
              Faktureringshistorik
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
} 