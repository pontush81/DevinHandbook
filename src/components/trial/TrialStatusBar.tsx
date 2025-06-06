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
        console.log('🔍 TrialStatusBar: Fetching trial status for userId:', userId);
        const response = await fetch(`/api/trial/check-status?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch trial status');
        }
        
        const status = await response.json();
        console.log('📊 TrialStatusBar: Received trial status:', status);
        setTrialStatus(status);
      } catch (err) {
        console.error('❌ TrialStatusBar: Error fetching trial status:', err);
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

  // Debug logging
  console.log('🎯 TrialStatusBar render state:', {
    isLoading,
    trialStatus,
    isVisible,
    userId
  });

  if (isLoading || !trialStatus || !isVisible) {
    return null;
  }

  // Visa endast för aktiva trials eller utgångna trials
  if (!trialStatus.isInTrial && trialStatus.subscriptionStatus !== 'expired') {
    console.log('🚫 TrialStatusBar: Not showing - no active trial or expired status');
    return null;
  }

  const isExpired = trialStatus.trialDaysRemaining <= 0;
  const isExpiringSoon = trialStatus.trialDaysRemaining <= 3 && !isExpired;

  // Utgången trial
  if (isExpired) {
    return (
      <Card className={`border-0 shadow-none bg-gradient-to-r from-red-50 to-orange-50 relative z-50 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 space-y-3 sm:space-y-0">
          <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex-shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                <h3 className="font-semibold text-red-900 text-sm sm:text-base">Provperioden har gått ut</h3>
                <Badge variant="destructive" className="text-xs w-fit">
                  Utgången
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-red-700 mt-1 pr-2">
                Din 30 dagars gratis trial gick ut {formatTrialEndDate(trialStatus.trialEndsAt)}. 
                Uppgradera nu för att fortsätta använda handboken.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              onClick={handleUpgrade}
              className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
              size="sm"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Uppgradera nu
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-100 flex-shrink-0"
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
      <Card className={`border-0 shadow-none bg-gradient-to-r from-yellow-50 to-orange-50 relative z-50 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 space-y-3 sm:space-y-0">
          <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex-shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                <h3 className="font-semibold text-yellow-900 text-sm sm:text-base">Trial slutar snart</h3>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs w-fit">
                  {trialStatus.trialDaysRemaining} dag{trialStatus.trialDaysRemaining !== 1 ? 'ar' : ''} kvar
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-yellow-700 mt-1 pr-2">
                Din gratis period slutar {formatTrialEndDate(trialStatus.trialEndsAt)}. 
                Uppgradera för att behålla tillgången.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              onClick={handleUpgrade}
              className="bg-yellow-600 hover:bg-yellow-700 text-white flex-1 sm:flex-none text-xs sm:text-sm"
              size="sm"
            >
              <CreditCard className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Uppgradera (2490 kr/år)</span>
              <span className="sm:hidden">Uppgradera</span>
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-yellow-600 hover:bg-yellow-100 flex-shrink-0"
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
    <Card className={`border-0 shadow-none bg-white border border-gray-200 relative z-50 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 space-y-3 sm:space-y-0">
        <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex-shrink-0">
            <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Gratisperiod aktiv</h3>
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 text-xs w-fit">
                {trialStatus.trialDaysRemaining} dagar kvar
              </Badge>
            </div>
            <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
              <Clock className="mr-1 h-3 w-3" />
              Trial slutar {formatTrialEndDate(trialStatus.trialEndsAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Button
            onClick={handleUpgrade}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50 flex-1 sm:flex-none text-xs sm:text-sm"
            size="sm"
          >
            <CreditCard className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Uppgradera tidigt</span>
            <span className="sm:hidden">Uppgradera</span>
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
} 