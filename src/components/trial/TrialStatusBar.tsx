import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, AlertTriangle, CreditCard, Gift, X } from 'lucide-react';

interface TrialStatus {
  isInTrial: boolean;
  trialDaysRemaining: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  canCreateHandbook: boolean;
  hasUsedTrial: boolean;
}

interface TrialStatusBarProps {
  userId: string;
  handbookId?: string;
  className?: string;
  onUpgrade?: () => void;
}

// Formaterar datum för visning
function formatTrialEndDate(trialEndsAt: string | null): string {
  if (!trialEndsAt) return '';
  
  const date = new Date(trialEndsAt);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function TrialStatusBar({ userId, handbookId, className = '', onUpgrade }: TrialStatusBarProps) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrialStatus() {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/trial/check-status?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch trial status');
        }
        
        const status = await response.json();
        setTrialStatus(status);
      } catch (err) {
        console.error('Error fetching trial status:', err);
        // Sätt default värden vid fel
        setTrialStatus({
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'none',
          trialEndsAt: null,
          canCreateHandbook: true,
          hasUsedTrial: false
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrialStatus();
    
    // Uppdatera var 5:e minut
    const interval = setInterval(fetchTrialStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Fallback: redirect till betalning
      window.open('/dashboard', '_blank');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (isLoading || !trialStatus || !isVisible) {
    return null;
  }

  // Visa endast för aktiva trials eller utgångna trials
  if (!trialStatus.isInTrial && trialStatus.subscriptionStatus !== 'expired') {
    return null;
  }

  const isExpired = trialStatus.trialDaysRemaining <= 0;
  const isExpiringSoon = trialStatus.trialDaysRemaining <= 3 && !isExpired;

  // Utgången trial
  if (isExpired) {
    return (
      <Card className={`border-0 shadow-sm bg-gradient-to-r from-red-50 to-orange-50 border-red-200 ${className}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-red-900">Provperioden har gått ut</h3>
                <Badge variant="destructive" className="text-xs">
                  Utgången
                </Badge>
              </div>
              <p className="text-sm text-red-700">
                Din 30 dagars gratis trial gick ut {formatTrialEndDate(trialStatus.trialEndsAt)}. 
                Uppgradera nu för att fortsätta använda handboken.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleUpgrade}
              className="bg-red-600 hover:bg-red-700 text-white"
              size="sm"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Uppgradera nu
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Aktiv trial som snart går ut
  if (isExpiringSoon) {
    return (
      <Card className={`border-0 shadow-sm bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 ${className}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-yellow-900">Trial slutar snart</h3>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                  {trialStatus.trialDaysRemaining} dag{trialStatus.trialDaysRemaining !== 1 ? 'ar' : ''} kvar
                </Badge>
              </div>
              <p className="text-sm text-yellow-700">
                Din gratis period slutar {formatTrialEndDate(trialStatus.trialEndsAt)}. 
                Uppgradera för att behålla tillgången.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleUpgrade}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              size="sm"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Uppgradera (2490 kr/år)
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-yellow-600 hover:bg-yellow-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Aktiv trial med tid kvar
  return (
    <Card className={`border-0 shadow-sm bg-gradient-to-r from-green-50 to-blue-50 border-green-200 ${className}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
            <Gift className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-green-900">Gratis trial aktiv</h3>
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                {trialStatus.trialDaysRemaining} dagar kvar
              </Badge>
            </div>
            <div className="flex items-center text-sm text-green-700">
              <Clock className="mr-1 h-3 w-3" />
              Trial slutar {formatTrialEndDate(trialStatus.trialEndsAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleUpgrade}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
            size="sm"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Uppgradera tidigt
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-green-600 hover:bg-green-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
} 