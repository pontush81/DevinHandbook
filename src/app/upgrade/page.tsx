"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { BlockedAccountScreen, EarlyUpgradeScreen } from '@/components/trial/BlockedAccountScreen';
import { getTrialStatus, TrialStatus } from '@/lib/trial-service';
import { supabase } from '@/lib/supabase';

export default function UpgradePage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [handbookInfo, setHandbookInfo] = useState<{ id: string; title: string; trial_end_date: string | null } | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // Get handbookId from URL params
  const handbookId = searchParams.get('handbookId');

  useEffect(() => {
    async function checkStatus() {
      // Wait for auth to finish loading before making any decisions
      if (authLoading) {
        console.log('[Upgrade] Auth still loading, waiting...');
        return;
      }
      
      // Mark that we've checked auth at least once
      setHasCheckedAuth(true);
      
      // Double-check session directly if user isn't set yet
      let currentUser = user;
      if (!currentUser) {
        console.log('[Upgrade] No user from AuthContext, checking session directly...');
        const { data: { user: sessionUser } } = await supabase.auth.getUser();
        currentUser = sessionUser;
        console.log('[Upgrade] Direct session check result:', sessionUser ? 'found user' : 'no user');
      }
      
      if (!currentUser) {
        console.log('[Upgrade] No user found after auth finished loading, redirecting to login');
        router.push('/login');
        return;
      }
      
      console.log('[Upgrade] User found, checking trial status:', currentUser.id);

      try {
        // If we have a specific handbook ID, check that handbook's trial status
        if (handbookId) {
          console.log('[Upgrade] Checking handbook-specific trial for:', handbookId);
          
          // Get handbook info including trial_end_date
          const { data: handbook, error: handbookError } = await supabase
            .from('handbooks')
            .select('id, title, trial_end_date, owner_id')
            .eq('id', handbookId)
            .eq('owner_id', currentUser.id) // Ensure user owns this handbook
            .single();

          if (handbookError || !handbook) {
            console.error('[Upgrade] Error fetching handbook or user does not own it:', handbookError);
            router.push('/dashboard');
            return;
          }

          setHandbookInfo(handbook);

          // Check if this handbook's trial has expired
          const now = new Date();
          const trialEndDate = handbook.trial_end_date ? new Date(handbook.trial_end_date) : null;
          
          if (trialEndDate && trialEndDate > now) {
            // Trial is still active for this handbook
            const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setTrialStatus({
              isInTrial: true,
              trialDaysRemaining: daysRemaining,
              subscriptionStatus: 'trial',
              trialEndsAt: handbook.trial_end_date,
              canCreateHandbook: true,
              hasUsedTrial: true
            });
          } else if (trialEndDate) {
            // Trial has expired for this handbook
            setTrialStatus({
              isInTrial: false,
              trialDaysRemaining: 0,
              subscriptionStatus: 'expired',
              trialEndsAt: handbook.trial_end_date,
              canCreateHandbook: false,
              hasUsedTrial: true
            });
          } else {
            // No trial for this handbook (probably paid)
            router.push('/dashboard');
            return;
          }
        } else {
          // Fallback to user-level trial check
          console.log('[Upgrade] No handbookId provided, checking user-level trial');
          const status = await getTrialStatus(currentUser.id);
          setTrialStatus(status);
          
          // If user has active subscription, redirect to dashboard
          if (status.subscriptionStatus === 'active') {
            router.push('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('[Upgrade] Error checking trial status:', error);
        // Set a default state to prevent blocking
        setTrialStatus({
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'expired',
          trialEndsAt: null,
          canCreateHandbook: false,
          hasUsedTrial: true
        });
      }
    }

    checkStatus();
  }, [user, authLoading, router, handbookId]);

  const handleUpgrade = async (planType: 'monthly' | 'yearly') => {
    // Get current user (either from context or direct check)
    let currentUser = user;
    if (!currentUser) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      currentUser = sessionUser;
    }
    if (!currentUser) return;

    try {
      setIsUpgrading(true);
      console.log(`[Upgrade] Creating ${planType} subscription for user ${currentUser.id}${handbookId ? ` and handbook ${handbookId}` : ''}`);

      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          handbookId: handbookId || undefined, // Include handbook ID if available
          planType: planType,
          successUrl: handbookInfo ? 
            `${window.location.origin}/upgrade-success?handbookId=${handbookId}&returnTo=handbook` : 
            `${window.location.origin}/upgrade-success`,
          cancelUrl: `${window.location.origin}/upgrade?handbookId=${handbookId || ''}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('[Upgrade] Error creating subscription session:', error);
      setIsUpgrading(false);
    }
  };

  // Not authenticated - only show this if we've actually checked auth
  // (This should rarely happen now since we do direct session checks)
  if (!user && hasCheckedAuth) {
    return null;
  }

  // Show loading while checking auth or trial status
  if (authLoading || !trialStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Kontrollerar trial-status...</p>
        </div>
      </div>
    );
  }

  // Successfully showing upgrade screen
  
  // Show appropriate upgrade screen based on trial status
  if (trialStatus.isInTrial) {
    // User has active trial - show early upgrade options
    return (
      <EarlyUpgradeScreen
        trialDaysRemaining={trialStatus.trialDaysRemaining}
        trialEndsAt={trialStatus.trialEndsAt || new Date().toISOString()}
        handbookName={handbookInfo?.title || "Din handbok"}
        onUpgrade={handleUpgrade}
        isUpgrading={isUpgrading}
      />
    );
  } else {
    // Trial has expired - show blocked screen
    return (
      <BlockedAccountScreen
        trialEndedAt={trialStatus.trialEndsAt || new Date().toISOString()}
        handbookName={handbookInfo?.title || "Din handbok"}
        onUpgrade={handleUpgrade}
        isUpgrading={isUpgrading}
      />
    );
  }
} 