'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedTrialStatus, getCachedOwnership } from '@/lib/api-helpers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bug, ChevronDown, ChevronUp, Wrench, RefreshCw } from 'lucide-react';

interface HandbookDebugInfoProps {
  handbookId: string;
}

interface TrialStatus {
  isInTrial: boolean;
  trialDaysRemaining: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  canCreateHandbook: boolean;
  hasUsedTrial: boolean;
}

interface HandbookData {
  created_at: string;
  trial_end_date: string | null;
  created_during_trial: boolean;
  sections: Array<{
    id: string;
    title: string;
    is_published: boolean;
  }>;
}

export function HandbookDebugInfo({ handbookId }: HandbookDebugInfoProps) {
  const { user } = useAuth();
  const [ownershipStatus, setOwnershipStatus] = useState<boolean | null>(null);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [handbookData, setHandbookData] = useState<HandbookData | null>(null);
  const [shouldShowPaywall, setShouldShowPaywall] = useState<boolean | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isExecutingWebhook, setIsExecutingWebhook] = useState(false);

  // Only show for specific emails
  const debugEmails = ['pontus.hberg@gmail.com', 'pontusaiagent@gmail.com'];
  const isDeveloper = user?.email && debugEmails.includes(user.email);

  useEffect(() => {
    if (!user || !isDeveloper) return;

    const fetchDebugData = async () => {
      try {
        // Check ownership using cached API
        const ownershipData = await getCachedOwnership(handbookId, user.id);
        setOwnershipStatus(ownershipData.isOwner);

        // Initialize trial status data
        let trialStatusData = {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'unknown',
          trialEndsAt: null,
          canCreateHandbook: false,
          hasUsedTrial: false
        };

        // Get trial status with error handling using cached API
        try {
          trialStatusData = await getCachedTrialStatus(handbookId, user.id);
          setTrialStatus(trialStatusData);
        } catch (trialError) {
          console.warn('Could not fetch trial status (user may not have access):', trialError);
          // Use fallback trial status for non-privileged users
          setTrialStatus(trialStatusData);
        }

        // Get handbook data
        const handbookResponse = await fetch(`/api/debug/handbook-data?handbookId=${handbookId}&userId=${user.id}`);
        const handbookDebugData = await handbookResponse.json();
        setHandbookData(handbookDebugData.handbook);

        // Calculate paywall visibility
        const shouldShow = !trialStatusData.isInTrial && trialStatusData.subscriptionStatus !== 'active';
        setShouldShowPaywall(shouldShow);

        // console.log('🐛 Debug Info Details:', {
        //   user,
        //   authLoading: undefined,
        //   ownershipStatus: ownershipData.isOwner,
        //   trialStatus: trialStatusData,
        //   shouldShowPaywall: shouldShow,
        //   handbookData: handbookDebugData.handbook
        // });
      } catch (error) {
        console.error('Debug info error:', error);
      }
    };

    fetchDebugData();
  }, [user, handbookId, isDeveloper]);

  const handleFixTrial = async () => {
    try {
      const response = await fetch('/api/debug/fix-handbook-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handbookId, userId: user?.id }),
      });

      if (response.ok) {
        // Refresh data after fix
        window.location.reload();
      }
    } catch (error) {
      console.error('Fix trial error:', error);
    }
  };

  const fixTrialData = async () => {
    setIsFixing(true);
    try {
      await handleFixTrial();
    } finally {
      setIsFixing(false);
    }
  };

  const checkPaymentStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/debug/check-payment-status?handbookId=${handbookId}&userId=${user?.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check payment status');
      }
      
      console.log('🔍 [Payment Status Debug] Full data:', data);
      console.log('📊 [Payment Status Debug] Summary:', data.summary);
      console.log('📖 [Payment Status Debug] Handbook:', data.handbook.data);
      console.log('💳 [Payment Status Debug] Handbook Subscriptions:', data.handbookSubscriptions.data);
      console.log('👤 [Payment Status Debug] User Subscriptions:', data.userSubscriptions.data);
      console.log('📝 [Payment Status Debug] Lifecycle Events:', data.lifecycleEvents.data);
      
      // Show alert with key info
      alert(`Payment Status Check:\n\n` +
        `Handbook Trial End Date: ${data.summary.handbookTrialEndDate || 'NULL (PAID)'}\n` +
        `Created During Trial: ${data.summary.handbookCreatedDuringTrial}\n` +
        `Active Handbook Subscriptions: ${data.summary.activeHandbookSubscriptions}\n` +
        `Total User Subscriptions: ${data.summary.totalUserSubscriptions}\n` +
        `Recent Lifecycle Events: ${data.summary.recentLifecycleEvents}\n\n` +
        `Check console for full details.`);
        
    } catch (error) {
      console.error('Error checking payment status:', error);
      alert(`Error checking payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllCache = async () => {
    setIsClearingCache(true);
    try {
      // Rensa localStorage säkert
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              console.warn('Could not remove localStorage item:', key);
            }
          });
          console.log('LocalStorage cleared');
        } catch (e) {
          console.warn('Could not access localStorage');
        }
      }

      // Rensa cookies
      if (typeof document !== 'undefined') {
        try {
          document.cookie.split(";").forEach((c) => {
            const eqPos = c.indexOf("=");
            const name = eqPos > -1 ? c.substr(0, eqPos) : c;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          });
          console.log('Cookies cleared');
        } catch (e) {
          console.warn('Could not clear cookies');
        }
      }

      // Rensa PWA cache via service worker
      if (typeof window !== 'undefined' && 'clearPWACache' in window) {
        try {
          (window as any).clearPWACache();
          return; // clearPWACache kommer att ladda om sidan
        } catch (e) {
          console.warn('Could not clear PWA cache');
        }
      }

      // Fallback - ladda om sidan
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert(`Error clearing cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearingCache(false);
    }
  };

  const markHandbookAsPaid = async () => {
    setIsMarkingPaid(true);
    try {
      const response = await fetch('/api/debug/mark-handbook-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handbookId, userId: user?.id }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark handbook as paid');
      }
      
      console.log('✅ [Mark as Paid] Success:', data);
      alert(`Handbook marked as paid successfully!\n\n${data.message}`);
      
      // Refresh the page to see updated status
      window.location.reload();
        
    } catch (error) {
      console.error('Error marking handbook as paid:', error);
      alert(`Error marking handbook as paid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const executeWebhookLogic = async () => {
    setIsExecutingWebhook(true);
    try {
      const response = await fetch('/api/debug/force-webhook-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handbookId, userId: user?.id, planType: 'monthly' }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute webhook logic');
      }
      
      console.log('🔧 [Force Webhook] Success:', data);
      alert(`Webhook logic executed successfully!\\n\\n${data.message}\\n\\nBefore: ${data.before.status}\\nAfter: ${data.after.status}\\n\\nPage will reload to show updated status.`);
      
      // Refresh the page to see updated status
      window.location.reload();
        
    } catch (error) {
      console.error('Error executing webhook logic:', error);
      alert(`Error executing webhook logic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecutingWebhook(false);
    }
  };

  // Don't render if not developer
  if (!isDeveloper) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Toggle Button */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          size="sm"
          variant="outline"
          className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 shadow-lg"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug
        </Button>
      )}

      {/* Debug Panel */}
      {isExpanded && (
        <Card className="w-96 max-h-96 overflow-y-auto bg-black text-white border-2 border-gray-600 shadow-2xl backdrop-blur-sm">
          <div className="p-4 bg-black/95">
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
              <div className="flex items-center space-x-2">
                <Bug className="h-4 w-4 text-green-400" />
                <h3 className="font-semibold text-sm text-white">Handbook Debug Info</h3>
              </div>
              <Button
                onClick={() => setIsExpanded(false)}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-800 p-1"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Debug Information */}
            <div className="space-y-2 text-xs text-gray-100">
              <div className="bg-gray-800/50 p-2 rounded">
                <strong className="text-white">Handbook ID:</strong> 
                <span className="text-gray-300 ml-2 font-mono text-xs">{handbookId}</span>
              </div>
              
              <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                <strong className="text-white">User:</strong> 
                <span className="text-green-400">{user ? 'logged_in' : 'not_logged_in'}</span>
              </div>
              
              <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                <strong className="text-white">Is Owner:</strong> 
                <span className={ownershipStatus ? 'text-green-400' : 'text-red-400'}>
                  {ownershipStatus === null ? 'Loading...' : ownershipStatus ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                <strong className="text-white">Paywall:</strong>
                {shouldShowPaywall === null ? (
                  <span className="text-yellow-400">Loading...</span>
                ) : shouldShowPaywall ? (
                  <Badge variant="destructive" className="text-xs bg-red-600 text-white">🚫 Visible</Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600 text-white text-xs">✅ Hidden</Badge>
                )}
              </div>

              <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                <strong className="text-white">Trial:</strong>
                {trialStatus ? (
                  <Badge 
                    variant={trialStatus.isInTrial ? "default" : "destructive"} 
                    className={`text-xs ${trialStatus.isInTrial ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                  >
                    {trialStatus.isInTrial ? `🟢 Active (${trialStatus.trialDaysRemaining} days)` : '🔴 Expired'}
                  </Badge>
                ) : (
                  <span className="text-yellow-400">Loading...</span>
                )}
              </div>

              {trialStatus && (
                <div className="space-y-1 bg-gray-800/30 p-2 rounded">
                  <div className="flex justify-between">
                    <strong className="text-white">Subscription:</strong> 
                    <span className="text-blue-400">{trialStatus.subscriptionStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <strong className="text-white">Trial End:</strong> 
                    <span className="text-gray-300">{trialStatus.trialEndsAt ? new Date(trialStatus.trialEndsAt).toLocaleDateString('sv-SE') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <strong className="text-white">Days Remaining:</strong> 
                    <span className="text-orange-400 font-bold">{trialStatus.trialDaysRemaining}</span>
                  </div>
                  <div className="flex justify-between">
                    <strong className="text-white">Has Used Trial:</strong> 
                    <span className={trialStatus.hasUsedTrial ? 'text-green-400' : 'text-red-400'}>
                      {trialStatus.hasUsedTrial ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              )}

              {handbookData && (
                <>
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="flex items-center space-x-2 mb-2 bg-gray-800/50 p-2 rounded">
                      <span>📊</span>
                      <strong className="text-white">Database Data:</strong>
                    </div>
                    <div className="space-y-1 bg-gray-800/30 p-2 rounded text-xs">
                      <div className="flex justify-between">
                        <strong className="text-white">Created:</strong> 
                        <span className="text-gray-300">{new Date(handbookData.created_at).toLocaleDateString('sv-SE')}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-white">Trial End DB:</strong> 
                        <span className="text-gray-300">{handbookData.trial_end_date ? new Date(handbookData.trial_end_date).toLocaleDateString('sv-SE') : 'NULL'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-white">Created During Trial:</strong> 
                        <span className={handbookData.created_during_trial ? 'text-green-400' : 'text-red-400'}>
                          {handbookData.created_during_trial ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-white">Sections:</strong> 
                        <span className="text-blue-400">{handbookData.sections?.filter(s => s.is_published).length || 0}/{handbookData.sections?.length || 0} visible</span>
                      </div>
                    </div>
                  </div>

                  {handbookData.sections && (
                    <div className="space-y-1 bg-gray-800/30 p-2 rounded max-h-32 overflow-y-auto">
                      <div className="text-white font-semibold text-xs mb-1">Sections:</div>
                      {handbookData.sections.map((section) => (
                        <div key={section.id} className="flex items-center space-x-2 text-xs">
                          <span className={section.is_published ? 'text-green-400' : 'text-red-400'}>
                            {section.is_published ? '✅' : '❌'}
                          </span>
                          <span className="text-gray-300 truncate flex-1">{section.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Debug Buttons */}
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="space-y-2">
                      {/* Fix Trial Button - only show if trial_end_date is null */}
                      {handbookData.trial_end_date === null && (
                        <Button
                          onClick={fixTrialData}
                          size="sm"
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={isFixing}
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          {isFixing ? "Fixar..." : "🔧 Fix Trial Data"}
                        </Button>
                      )}
                      
                      {/* Check Payment Status Button - always show */}
                      <Button
                        onClick={checkPaymentStatus}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isLoading}
                      >
                        <Bug className="h-3 w-3 mr-1" />
                        {isLoading ? "Kollar..." : "🔍 Check Payment Status"}
                      </Button>
                      
                                            {/* Clear Cache Button - always show */}
                      <Button
                        onClick={clearAllCache}
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        disabled={isClearingCache}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isClearingCache ? 'animate-spin' : ''}`} />
                        {isClearingCache ? "Rensar..." : "🗑️ Rensa All Cache"}
                      </Button>

                      {/* Execute Webhook Logic Button - show for trial handbooks */}
                      {handbookData && handbookData.trial_end_date && (
                        <Button
                          onClick={executeWebhookLogic}
                          size="sm"
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={isExecutingWebhook}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isExecutingWebhook ? 'animate-spin' : ''}`} />
                          {isExecutingWebhook ? "Kör webhook..." : "🔧 Execute Webhook Logic"}
                        </Button>
                      )}

                      {/* Mark as Paid Button - always show */}
                      <Button
                        onClick={markHandbookAsPaid}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={isMarkingPaid}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isMarkingPaid ? 'animate-spin' : ''}`} />
                        {isMarkingPaid ? "Markerar..." : "💳 Mark as Paid"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 