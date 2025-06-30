import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, AlertTriangle, CreditCard, Gift, X, Shield } from 'lucide-react';
import { useHandbookTrialStatus, useHandbookOwnership, useAdminStatus } from '@/hooks/useApi';

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

// Global function to refresh trial status - used by upgrade-success page
declare global {
  interface Window {
    refreshTrialStatus: () => void;
  }
}

// Formaterar datum för visning
function formatTrialEndDate(trialEndsAt: string | null): string {
  if (!trialEndsAt) return 'Okänt datum';
  
  const date = new Date(trialEndsAt);
  const now = new Date();
  
  // Om datumet är idag
  if (date.toDateString() === now.toDateString()) {
    return 'idag';
  }
  
  // Om datumet är imorgon
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'imorgon';
  }
  
  // Annars visa datum
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function TrialStatusBar({ userId, handbookId, className = '', onUpgrade }: TrialStatusBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Professional React Query hooks - automatic caching, deduplication, and error handling
  const { data: adminStatus } = useAdminStatus(userId);
  const { data: ownershipData } = useHandbookOwnership(handbookId, userId);
  const { data: trialStatus, isLoading } = useHandbookTrialStatus(handbookId, userId);

  const isSuperAdmin = adminStatus?.isSuperAdmin || false;
  const isHandbookOwner = ownershipData?.isOwner || false;

  // Setup BroadcastChannel to listen for payment completion
  useEffect(() => {
    const channel = new BroadcastChannel('payment-status');
    
    const handlePaymentComplete = (event: MessageEvent) => {
      if (event.data.type === 'payment-completed' && event.data.handbookId === handbookId) {
        console.log('🎉 TrialStatusBar: Payment completed, refreshing trial status');
        // React Query will automatically refresh the data
      }
    };

    channel.addEventListener('message', handlePaymentComplete);

    // Setup global function for manual refresh
    window.refreshTrialStatus = () => {
      console.log('🔄 TrialStatusBar: Manual refresh triggered');
      // React Query handles refresh automatically
    };

    return () => {
      channel.removeEventListener('message', handlePaymentComplete);
      channel.close();
      if (window.refreshTrialStatus) {
        delete window.refreshTrialStatus;
      }
    };
  }, [handbookId]);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Fallback: redirect till betalning med handbookId
      const upgradeUrl = handbookId ? `/upgrade?handbookId=${handbookId}` : '/upgrade';
      window.location.href = upgradeUrl;
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Don't show if user doesn't own this handbook and isn't superadmin
  if (!isHandbookOwner && !isSuperAdmin) {
    return null;
  }

  // Don't show if still loading or no trial status data or user dismissed it
  if (isLoading || !trialStatus || !isVisible) {
    return null;
  }

  // Visa för aktiva trials ELLER utgångna trials
  // INTE för aktiva prenumerationer som inte är i trial
  // console.log('🎯 TrialStatusBar visibility check:', {
  //   isInTrial: trialStatus.isInTrial,
  //   subscriptionStatus: trialStatus.subscriptionStatus,
  //   trialDaysRemaining: trialStatus.trialDaysRemaining,
  //   shouldShow: trialStatus.isInTrial || (trialStatus.subscriptionStatus === 'expired' && trialStatus.trialEndsAt)
  // });
  
  // Visa bannern om:
  // 1. Användaren är i aktiv trial ELLER
  // 2. Trial har gått ut men subscriptionen är expired (inte active)
  if (!trialStatus.isInTrial && trialStatus.subscriptionStatus !== 'expired') {
    console.log('🚫 TrialStatusBar hidden: trial not active and subscription not expired');
    return null;
  }

  // console.log('✅ TrialStatusBar: Should render banner!', {
  //   isInTrial: trialStatus.isInTrial,
  //   subscriptionStatus: trialStatus.subscriptionStatus,
  //   trialDaysRemaining: trialStatus.trialDaysRemaining,
  //   isExpired: trialStatus.trialDaysRemaining <= 0
  // });

  const isExpired = trialStatus.trialDaysRemaining <= 0;
  const isExpiringSoon = trialStatus.trialDaysRemaining <= 3 && !isExpired;

  // Special banner for superadmins viewing other users' handbooks
  if (isSuperAdmin && !isHandbookOwner) {
    return (
      <Card className={`border-0 shadow-none bg-gradient-to-r from-blue-50 to-indigo-50 relative z-50 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 space-y-3 sm:space-y-0">
          <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex-shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                <h3 className="font-semibold text-blue-900 text-sm sm:text-base">Superadmin - Handbok-status</h3>
                <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs w-fit">
                  {trialStatus.isInTrial ? `${trialStatus.trialDaysRemaining} dagar trial kvar` : 
                   trialStatus.subscriptionStatus === 'active' ? 'Betald' : 'Trial utgången'}
                </Badge>
              </div>
              <div className="flex items-center text-xs sm:text-sm text-blue-700 mt-1">
                <Clock className="mr-1 h-3 w-3" />
                {trialStatus.isInTrial ? 
                  `Trial slutar ${formatTrialEndDate(trialStatus.trialEndsAt)}` :
                  trialStatus.subscriptionStatus === 'active' ? 'Aktiv prenumeration' :
                  `Trial gick ut ${formatTrialEndDate(trialStatus.trialEndsAt)}`
                }
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
              Admin-vy
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

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
                              <span className="hidden sm:inline">Uppgradera (1490 kr/år)</span>
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