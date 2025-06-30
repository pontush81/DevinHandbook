"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

// Loading component för Suspense
function LoadingSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
      <Card className="shadow-xl border-t-4 border-t-green-500 max-w-md w-full">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Laddar...
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

// Huvudkomponent som använder useSearchParams
function UpgradeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [handbookSlug, setHandbookSlug] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const handbookId = searchParams.get('handbookId');
  const returnTo = searchParams.get('returnTo');

  // Verifiera betalning i bakgrunden och fixa eventuella webhook-problem
  useEffect(() => {
    async function verifyAndFixPayment() {
      if (!sessionId || !user) return;

      try {
        console.log('[Upgrade Success] Verifying payment and fixing any issues...');
        
        // Kör auto-fix för att säkerställa att betalningen registreras
        const response = await fetch('/api/stripe/auto-fix-failed-webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId: user.id,
            handbookId: handbookId || undefined
          })
        });

        const result = await response.json();
        console.log('[Upgrade Success] Auto-fix result:', result);
        
        // Notify all tabs about payment completion using BroadcastChannel
        if (handbookId) {
          console.log('[Upgrade Success] Broadcasting payment completion...');
          const channel = new BroadcastChannel('payment-status');
          channel.postMessage({
            type: 'payment-completed',
            handbookId: handbookId,
            userId: user.id,
            timestamp: Date.now()
          });
          channel.close();

          // Also trigger refresh function if available (for current tab)
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.refreshTrialStatus) {
              console.log('[Upgrade Success] Triggering trial status refresh...');
              window.refreshTrialStatus();
            } else {
              console.log('[Upgrade Success] Global refresh function not available, using fallback');
              // Fallback: try to refresh trial status via direct API call
              fetch(`/api/handbook/${handbookId}/trial-status?userId=${user.id}&t=${Date.now()}`, {
                cache: 'no-store'
              }).then(() => {
                console.log('[Upgrade Success] Trial status API called as fallback');
              }).catch(err => {
                console.warn('[Upgrade Success] Fallback API call failed:', err);
              });
            }
          }, 2000); // Give webhook time to process
        }
        
      } catch (error) {
        console.error('[Upgrade Success] Payment verification failed:', error);
      }
    }

    verifyAndFixPayment();
  }, [sessionId, user, handbookId]);

  // Hämta handbok slug om vi har ett handbookId
  useEffect(() => {
    if (handbookId && returnTo === 'handbook') {
      fetch(`/api/handbooks/${handbookId}`)
        .then(res => res.json())
        .then(data => {
          if (data.slug) {
            setHandbookSlug(data.slug);
          }
        })
        .catch(err => {
          console.error('Failed to fetch handbook:', err);
        });
    }
  }, [handbookId, returnTo]);

  const goToDestination = () => {
    if (handbookSlug && returnTo === 'handbook') {
      router.push(`/${handbookSlug}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
      <Card className="shadow-xl border-t-4 border-t-green-500 max-w-md w-full">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Tack för din betalning! 🎉
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Betalningen genomfördes. Handboken är nu aktiverad.
          </p>
        </CardHeader>
        
        <CardContent className="text-center">
          <Button 
            onClick={goToDestination}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
          >
            {handbookSlug && returnTo === 'handbook' ? 'Gå till handboken' : 'Fortsätt'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Huvudkomponent med Suspense wrapper
export default function UpgradeSuccessPage() {
  return (
    <Suspense fallback={<LoadingSuccess />}>
      <UpgradeSuccessContent />
    </Suspense>
  );
} 