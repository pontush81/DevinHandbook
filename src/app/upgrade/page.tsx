"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { BlockedAccountScreen } from '@/components/trial/BlockedAccountScreen';
import { getTrialStatus, TrialStatus } from '@/lib/trial-service';

export default function UpgradePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const status = await getTrialStatus(user.id);
        setTrialStatus(status);
        
        // Om användaren fortfarande har trial eller är aktiv kund - redirecta
        if (status.isInTrial || status.subscriptionStatus === 'active') {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [user, authLoading, router]);

  const handleUpgrade = async (planType: 'monthly' | 'yearly') => {
    if (!user) return;
    
    setIsUpgrading(true);
    try {
      console.log(`[Upgrade] Creating ${planType} subscription for user ${user.id}`);
      
      // Skapa Stripe checkout session för uppgradering
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planType: planType,
          successUrl: `${window.location.origin}/upgrade-success`,
          cancelUrl: `${window.location.origin}/upgrade`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const { sessionId, url } = await response.json();
      
      if (url) {
        // Redirecta till Stripe checkout
        console.log(`[Upgrade] Redirecting to Stripe checkout: ${sessionId}`);
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating upgrade session:', error);
      setIsUpgrading(false);
      alert('Något gick fel. Försök igen eller kontakta support.');
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Kontrollerar kontostatus...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  // Trial still active or already paying
  if (!trialStatus || trialStatus.isInTrial || trialStatus.subscriptionStatus === 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Omdirigerar...</p>
        </div>
      </div>
    );
  }

  // Show blocked screen with upgrade options
  return (
    <BlockedAccountScreen
      trialEndedAt={trialStatus.trialEndsAt || new Date().toISOString()}
      handbookName="Din handbok" // Du kan hämta detta från databasen om du vill
      onUpgrade={handleUpgrade}
      isUpgrading={isUpgrading}
    />
  );
} 