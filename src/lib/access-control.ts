import { getServiceSupabase } from '@/lib/supabase';

/**
 * Unified subscription status type - single source of truth
 */
export type SubscriptionStatus = 
  | 'active'           // Betald och aktiv
  | 'trial'            // I trial-period
  | 'expired'          // Gått ut (behöver förnyelse)
  | 'cancelled'        // Uppsagd
  | 'suspended'        // Suspenderad (betalningsproblem)
  | 'none';            // Ingen subscription

/**
 * Access control result with detailed information
 */
export interface AccessControlResult {
  hasAccess: boolean;
  reason: string;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
  trialEndsAt: string | null;
  daysRemaining: number;
  canUpgrade: boolean;
  isPaid: boolean;
  metadata: {
    checkedAt: string;
    userId: string;
    handbookId: string;
    checkMethod: 'handbook' | 'subscription' | 'account' | 'fallback';
    debugInfo?: any;
  };
}

/**
 * Professional Access Control System
 * 
 * Centralized, hierarchical access control with comprehensive logging
 * and error handling. Follows the principle of least privilege.
 */
export class AccessController {
  private static readonly CACHE_TTL = 60 * 1000; // 1 minute cache
  private static cache = new Map<string, { result: AccessControlResult; timestamp: number }>();

  /**
   * Main access control method - checks if user has access to a handbook
   * 
   * @param userId - User ID to check access for
   * @param handbookId - Handbook ID to check access to
   * @param options - Additional options for access checking
   * @returns Promise<AccessControlResult> - Detailed access result
   */
  static async hasHandbookAccess(
    userId: string, 
    handbookId: string,
    options: {
      skipCache?: boolean;
      requireFullAccess?: boolean;
      logAccess?: boolean;
    } = {}
  ): Promise<AccessControlResult> {
    const startTime = Date.now();
    const cacheKey = `${userId}:${handbookId}:${options.requireFullAccess || false}`;

    try {
      // Check cache first (unless explicitly skipped)
      if (!options.skipCache) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          console.log(`🚀 [AccessController] Cache hit for ${cacheKey}`);
          return cached;
        }
      }

      console.log(`🔍 [AccessController] Checking access for user ${userId} to handbook ${handbookId}`);

      const supabase = getServiceSupabase();
      const result = await this.performAccessCheck(supabase, userId, handbookId, options);

      // Cache the result
      this.setCachedResult(cacheKey, result);

      // Log access attempt if requested
      if (options.logAccess) {
        await this.logAccessAttempt(userId, handbookId, result, Date.now() - startTime);
      }

      console.log(`✅ [AccessController] Access check completed in ${Date.now() - startTime}ms:`, {
        userId,
        handbookId,
        hasAccess: result.hasAccess,
        reason: result.reason,
        status: result.subscriptionStatus
      });

      return result;

    } catch (error) {
      console.error(`❌ [AccessController] Error checking access:`, error);
      
      // Return safe fallback
      return {
        hasAccess: false,
        reason: 'access_check_failed',
        subscriptionStatus: 'none',
        expiresAt: null,
        trialEndsAt: null,
        daysRemaining: 0,
        canUpgrade: true,
        isPaid: false,
        metadata: {
          checkedAt: new Date().toISOString(),
          userId,
          handbookId,
          checkMethod: 'fallback',
          debugInfo: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      };
    }
  }

  /**
   * Performs the actual access check with hierarchical logic
   */
  private static async performAccessCheck(
    supabase: any,
    userId: string,
    handbookId: string,
    options: any
  ): Promise<AccessControlResult> {
    
    // STEP 1: Check if user is superadmin (always has access)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', userId)
      .single();

    if (profile?.is_superadmin) {
      return this.createAccessResult(true, 'superadmin_access', 'active', userId, handbookId, 'account');
    }

    // STEP 2: Check handbook ownership and basic info
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, owner_id, trial_end_date, created_during_trial, published')
      .eq('id', handbookId)
      .single();

    if (handbookError || !handbook) {
      return this.createAccessResult(false, 'handbook_not_found', 'none', userId, handbookId, 'fallback');
    }

    const isOwner = handbook.owner_id === userId;

    // STEP 3: Check membership (if not owner)
    let userRole: string | null = null;
    if (!isOwner) {
      const { data: memberData } = await supabase
        .from('handbook_members')
        .select('role')
        .eq('handbook_id', handbookId)
        .eq('user_id', userId)
        .maybeSingle();

      userRole = memberData?.role || null;

      // If requiring full access, check if user has admin/editor rights
      if (options.requireFullAccess && !['admin', 'editor'].includes(userRole || '')) {
        return this.createAccessResult(false, 'insufficient_permissions', 'none', userId, handbookId, 'account');
      }
    }

    // STEP 4: If handbook is published and user is member/viewer, grant basic access
    if (handbook.published && (isOwner || userRole)) {
      // For published handbooks, members always have at least viewing access
      if (!options.requireFullAccess || isOwner || ['admin', 'editor'].includes(userRole || '')) {
        return this.createAccessResult(true, 'published_handbook_access', 'active', userId, handbookId, 'handbook');
      }
    }

    // STEP 5: Check handbook payment status (primary check)
    if (handbook.trial_end_date === null) {
      // Handbook is paid - grant access to owners and members
      if (isOwner || userRole) {
        return this.createAccessResult(true, 'paid_handbook_access', 'active', userId, handbookId, 'handbook', {
          isPaid: true
        });
      }
    }

    // STEP 6: Check trial status for handbook
    if (handbook.trial_end_date) {
      const trialEndDate = new Date(handbook.trial_end_date);
      const now = new Date();
      const isTrialActive = trialEndDate > now;
      const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      if (isTrialActive && (isOwner || userRole)) {
        return this.createAccessResult(true, 'trial_access', 'trial', userId, handbookId, 'handbook', {
          trialEndsAt: handbook.trial_end_date,
          daysRemaining
        });
      } else if (!isTrialActive) {
        return this.createAccessResult(false, 'trial_expired', 'expired', userId, handbookId, 'handbook', {
          trialEndsAt: handbook.trial_end_date,
          daysRemaining: 0
        });
      }
    }

    // STEP 7: Check subscription status (secondary check)
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('status, plan_type, expires_at, cancelled_at, metadata')
      .eq('user_id', isOwner ? userId : handbook.owner_id) // Check owner's subscriptions
      .eq('handbook_id', handbookId)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (subscriptions && subscriptions.length > 0) {
      const subscription = subscriptions[0];
      
      if (subscription.status === 'active') {
        // Check if subscription has expired
        if (subscription.expires_at) {
          const expiresAt = new Date(subscription.expires_at);
          const now = new Date();
          
          if (expiresAt <= now) {
            return this.createAccessResult(false, 'subscription_expired', 'expired', userId, handbookId, 'subscription', {
              expiresAt: subscription.expires_at
            });
          }
        }

        // Active subscription - grant access
        if (isOwner || userRole) {
          return this.createAccessResult(true, 'active_subscription', 'active', userId, handbookId, 'subscription', {
            expiresAt: subscription.expires_at,
            isPaid: true
          });
        }
      } else if (subscription.status === 'cancelled') {
        return this.createAccessResult(false, 'subscription_cancelled', 'cancelled', userId, handbookId, 'subscription', {
          cancelledAt: subscription.cancelled_at
        });
      }
    }

    // STEP 8: Check account status (fallback)
    const { data: accountStatus } = await supabase
      .from('account_status')
      .select('status, can_access_handbooks, suspended_at, suspension_reason')
      .eq('user_id', userId)
      .single();

    if (accountStatus) {
      if (accountStatus.status === 'suspended') {
        return this.createAccessResult(false, 'account_suspended', 'suspended', userId, handbookId, 'account', {
          suspendedAt: accountStatus.suspended_at,
          suspensionReason: accountStatus.suspension_reason
        });
      }

      if (!accountStatus.can_access_handbooks) {
        return this.createAccessResult(false, 'account_access_denied', 'none', userId, handbookId, 'account');
      }
    }

    // STEP 9: Final fallback - no access
    return this.createAccessResult(false, 'no_valid_access', 'none', userId, handbookId, 'fallback');
  }

  /**
   * Creates a standardized access result object
   */
  private static createAccessResult(
    hasAccess: boolean,
    reason: string,
    status: SubscriptionStatus,
    userId: string,
    handbookId: string,
    checkMethod: 'handbook' | 'subscription' | 'account' | 'fallback',
    additionalData: any = {}
  ): AccessControlResult {
    return {
      hasAccess,
      reason,
      subscriptionStatus: status,
      expiresAt: additionalData.expiresAt || null,
      trialEndsAt: additionalData.trialEndsAt || null,
      daysRemaining: additionalData.daysRemaining || 0,
      canUpgrade: !hasAccess || status === 'trial',
      isPaid: additionalData.isPaid || false,
      metadata: {
        checkedAt: new Date().toISOString(),
        userId,
        handbookId,
        checkMethod,
        debugInfo: additionalData
      }
    };
  }

  /**
   * Cache management methods
   */
  private static getCachedResult(key: string): AccessControlResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCachedResult(key: string, result: AccessControlResult): void {
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  /**
   * Clears cache for specific user or all cache
   */
  static clearCache(userId?: string): void {
    if (userId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Logs access attempts for monitoring and debugging
   */
  private static async logAccessAttempt(
    userId: string,
    handbookId: string,
    result: AccessControlResult,
    responseTimeMs: number
  ): Promise<void> {
    try {
      const supabase = getServiceSupabase();
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'handbook_access_check',
        resource_type: 'handbook',
        resource_id: handbookId,
        success: result.hasAccess,
        metadata: {
          ...result.metadata,
          responseTimeMs,
          accessResult: result
        }
      });
    } catch (error) {
      console.error('Failed to log access attempt:', error);
    }
  }

  /**
   * Utility methods for common checks
   */
  static async isHandbookOwner(userId: string, handbookId: string): Promise<boolean> {
    const result = await this.hasHandbookAccess(userId, handbookId);
    return result.metadata.checkMethod === 'handbook' && result.hasAccess;
  }

  static async canEditHandbook(userId: string, handbookId: string): Promise<boolean> {
    const result = await this.hasHandbookAccess(userId, handbookId, { requireFullAccess: true });
    return result.hasAccess;
  }

  static async getSubscriptionStatus(userId: string, handbookId: string): Promise<SubscriptionStatus> {
    const result = await this.hasHandbookAccess(userId, handbookId);
    return result.subscriptionStatus;
  }
}

/**
 * Utility functions for backward compatibility
 */
export async function hasHandbookAccess(userId: string, handbookId: string): Promise<boolean> {
  const result = await AccessController.hasHandbookAccess(userId, handbookId);
  return result.hasAccess;
}

export async function getHandbookAccessDetails(userId: string, handbookId: string): Promise<AccessControlResult> {
  return AccessController.hasHandbookAccess(userId, handbookId, { logAccess: true });
} 