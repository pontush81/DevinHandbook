import { getServiceSupabase } from '@/lib/supabase';
import { AccessController, type SubscriptionStatus, type AccessControlResult } from './access-control';

/**
 * Comprehensive subscription information
 */
export interface SubscriptionInfo {
  id: string;
  status: SubscriptionStatus;
  planType: 'monthly' | 'annual';
  startedAt: string;
  expiresAt: string | null;
  trialEndsAt: string | null;
  lastPaymentAt: string | null;
  nextPaymentDue: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  autoRenewal: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  metadata: any;
}

/**
 * Subscription health check result
 */
export interface SubscriptionHealthCheck {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
  expiresInDays: number | null;
  requiresAction: boolean;
  actionType: 'payment' | 'renewal' | 'upgrade' | 'reactivation' | null;
  checkTime: string;
}

/**
 * Professional Subscription Management Service
 * 
 * Handles all subscription-related operations including lifecycle management,
 * expiry checking, automatic status updates, and health monitoring.
 */
export class SubscriptionService {
  private static readonly EXPIRY_WARNING_DAYS = [30, 7, 3, 1]; // Days before expiry to send warnings
  private static readonly GRACE_PERIOD_DAYS = 3; // Days after expiry before suspension

  /**
   * Gets comprehensive subscription information for a user and handbook
   */
  static async getSubscriptionInfo(
    userId: string, 
    handbookId: string
  ): Promise<SubscriptionInfo | null> {
    try {
      console.log(`📊 [SubscriptionService] Getting subscription info for user ${userId}, handbook ${handbookId}`);
      
      const supabase = getServiceSupabase();
      
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('handbook_id', handbookId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      if (!subscription) {
        return null;
      }

      // Determine actual status based on current state
      const actualStatus = await this.calculateActualStatus(subscription);

      return {
        id: subscription.id,
        status: actualStatus,
        planType: subscription.plan_type === 'annual' ? 'annual' : 'monthly',
        startedAt: subscription.started_at,
        expiresAt: subscription.expires_at,
        trialEndsAt: subscription.trial_ends_at,
        lastPaymentAt: subscription.last_payment_at,
        nextPaymentDue: subscription.next_payment_due,
        cancelledAt: subscription.cancelled_at,
        cancellationReason: subscription.cancellation_reason,
        autoRenewal: subscription.auto_renewal,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        stripeCustomerId: subscription.stripe_customer_id,
        metadata: subscription.metadata
      };

    } catch (error) {
      console.error('[SubscriptionService] Error getting subscription info:', error);
      return null;
    }
  }

  /**
   * Performs comprehensive health check on subscription
   */
  static async performHealthCheck(
    userId: string, 
    handbookId: string
  ): Promise<SubscriptionHealthCheck> {
    const checkTime = new Date().toISOString();
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get access control result
      const accessResult = await AccessController.hasHandbookAccess(userId, handbookId);
      const subscriptionInfo = await this.getSubscriptionInfo(userId, handbookId);

      let expiresInDays: number | null = null;
      let requiresAction = false;
      let actionType: 'payment' | 'renewal' | 'upgrade' | 'reactivation' | null = null;

      // Check expiry status
      if (subscriptionInfo?.expiresAt) {
        const expiresAt = new Date(subscriptionInfo.expiresAt);
        const now = new Date();
        expiresInDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (expiresInDays <= 0) {
          issues.push('Subscription has expired');
          requiresAction = true;
          actionType = 'renewal';
          recommendations.push('Renew subscription immediately to restore access');
        } else if (expiresInDays <= 7) {
          issues.push(`Subscription expires in ${expiresInDays} days`);
          requiresAction = true;
          actionType = 'renewal';
          recommendations.push('Consider renewing subscription to avoid service interruption');
        }
      }

      // Check trial status
      if (accessResult.subscriptionStatus === 'trial' && accessResult.trialEndsAt) {
        const trialEndDate = new Date(accessResult.trialEndsAt);
        const now = new Date();
        const trialDaysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (trialDaysRemaining <= 0) {
          issues.push('Trial period has ended');
          requiresAction = true;
          actionType = 'upgrade';
          recommendations.push('Upgrade to a paid plan to continue using the service');
        } else if (trialDaysRemaining <= 3) {
          issues.push(`Trial ends in ${trialDaysRemaining} days`);
          requiresAction = true;
          actionType = 'upgrade';
          recommendations.push('Consider upgrading before trial expires');
        }
      }

      // Check subscription status
      if (accessResult.subscriptionStatus === 'cancelled') {
        issues.push('Subscription has been cancelled');
        requiresAction = true;
        actionType = 'reactivation';
        recommendations.push('Reactivate subscription or create a new one');
      }

      if (accessResult.subscriptionStatus === 'suspended') {
        issues.push('Account is suspended');
        requiresAction = true;
        actionType = 'payment';
        recommendations.push('Contact support or resolve payment issues');
      }

      // Check payment failures
      if (subscriptionInfo && !subscriptionInfo.autoRenewal) {
        issues.push('Auto-renewal is disabled');
        recommendations.push('Enable auto-renewal to prevent service interruption');
      }

      const isHealthy = issues.length === 0 && accessResult.hasAccess;

      return {
        isHealthy,
        issues,
        recommendations,
        expiresInDays,
        requiresAction,
        actionType,
        checkTime
      };

    } catch (error) {
      console.error('[SubscriptionService] Error performing health check:', error);
      return {
        isHealthy: false,
        issues: ['Health check failed'],
        recommendations: ['Contact support'],
        expiresInDays: null,
        requiresAction: true,
        actionType: null,
        checkTime
      };
    }
  }

  /**
   * Calculates the actual subscription status based on current time and data
   */
  private static async calculateActualStatus(subscription: any): Promise<SubscriptionStatus> {
    const now = new Date();

    // Check if subscription is explicitly cancelled
    if (subscription.status === 'cancelled' || subscription.cancelled_at) {
      return 'cancelled';
    }

    // Check if subscription has expired
    if (subscription.expires_at) {
      const expiresAt = new Date(subscription.expires_at);
      if (expiresAt <= now) {
        // Check grace period
        const gracePeriodEnd = new Date(expiresAt.getTime() + this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        if (now > gracePeriodEnd) {
          return 'expired';
        } else {
          // Still in grace period
          return 'active';
        }
      }
    }

    // Check trial status
    if (subscription.trial_ends_at) {
      const trialEndsAt = new Date(subscription.trial_ends_at);
      if (trialEndsAt > now) {
        return 'trial';
      } else if (subscription.status === 'active') {
        return 'active';
      } else {
        return 'expired';
      }
    }

    // Default to database status
    switch (subscription.status) {
      case 'active':
        return 'active';
      case 'cancelled':
        return 'cancelled';
      case 'expired':
        return 'expired';
      case 'suspended':
        return 'suspended';
      default:
        return 'none';
    }
  }

  /**
   * Updates subscription status based on current conditions
   */
  static async updateSubscriptionStatus(
    subscriptionId: string,
    reason: string = 'automatic_update'
  ): Promise<boolean> {
    try {
      console.log(`🔄 [SubscriptionService] Updating subscription status for ${subscriptionId}`);
      
      const supabase = getServiceSupabase();
      
      // Get current subscription
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) {
        console.error('Error fetching subscription for update:', fetchError);
        return false;
      }

      const newStatus = await this.calculateActualStatus(subscription);
      
      // Only update if status has changed
      if (newStatus !== subscription.status) {
        const updateData: any = {
          status: newStatus,
          updated_at: new Date().toISOString(),
          metadata: {
            ...subscription.metadata,
            last_status_update: new Date().toISOString(),
            status_update_reason: reason,
            previous_status: subscription.status
          }
        };

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('id', subscriptionId);

        if (updateError) {
          console.error('Error updating subscription status:', updateError);
          return false;
        }

        // Log the status change
        await this.logStatusChange(subscription.user_id, subscriptionId, subscription.status, newStatus, reason);
        
        console.log(`✅ [SubscriptionService] Updated subscription ${subscriptionId} status: ${subscription.status} → ${newStatus}`);
        
        // Clear cache for this user
        AccessController.clearCache(subscription.user_id);
        
        return true;
      }

      return true; // No update needed, but operation successful

    } catch (error) {
      console.error('[SubscriptionService] Error updating subscription status:', error);
      return false;
    }
  }

  /**
   * Checks all subscriptions for expiry and updates status accordingly
   */
  static async performBulkExpiryCheck(): Promise<{
    checked: number;
    updated: number;
    errors: number;
  }> {
    console.log('🔍 [SubscriptionService] Starting bulk expiry check...');
    
    const results = { checked: 0, updated: 0, errors: 0 };
    
    try {
      const supabase = getServiceSupabase();
      
      // Get all active subscriptions that might need status updates
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, expires_at, trial_ends_at')
        .in('status', ['active', 'trial'])
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('Error fetching subscriptions for bulk check:', error);
        return results;
      }

      results.checked = subscriptions?.length || 0;

      if (subscriptions) {
        for (const subscription of subscriptions) {
          try {
            const updated = await this.updateSubscriptionStatus(subscription.id, 'bulk_expiry_check');
            if (updated) {
              results.updated++;
            }
          } catch (error) {
            console.error(`Error updating subscription ${subscription.id}:`, error);
            results.errors++;
          }
        }
      }

      console.log(`✅ [SubscriptionService] Bulk expiry check completed:`, results);
      return results;

    } catch (error) {
      console.error('[SubscriptionService] Error in bulk expiry check:', error);
      results.errors++;
      return results;
    }
  }

  /**
   * Sends expiry warnings to users whose subscriptions are about to expire
   */
  static async sendExpiryWarnings(): Promise<{
    warnings_sent: number;
    errors: number;
  }> {
    console.log('📧 [SubscriptionService] Sending expiry warnings...');
    
    const results = { warnings_sent: 0, errors: 0 };
    
    try {
      const supabase = getServiceSupabase();
      
      for (const warningDays of this.EXPIRY_WARNING_DAYS) {
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() + warningDays);
        
        // Find subscriptions expiring in X days
        const { data: expiringSubscriptions, error } = await supabase
          .from('subscriptions')
          .select('id, user_id, handbook_id, expires_at, metadata')
          .eq('status', 'active')
          .gte('expires_at', warningDate.toISOString().split('T')[0])
          .lt('expires_at', new Date(warningDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (error) {
          console.error(`Error fetching subscriptions expiring in ${warningDays} days:`, error);
          results.errors++;
          continue;
        }

        if (expiringSubscriptions) {
          for (const subscription of expiringSubscriptions) {
            try {
              // Check if we've already sent this warning
              const warningKey = `expiry_warning_${warningDays}d`;
              if (!subscription.metadata?.warnings_sent?.[warningKey]) {
                await this.sendExpiryWarning(subscription.user_id, subscription.handbook_id, warningDays);
                
                // Mark warning as sent
                await supabase
                  .from('subscriptions')
                  .update({
                    metadata: {
                      ...subscription.metadata,
                      warnings_sent: {
                        ...subscription.metadata?.warnings_sent,
                        [warningKey]: new Date().toISOString()
                      }
                    }
                  })
                  .eq('id', subscription.id);
                
                results.warnings_sent++;
              }
            } catch (error) {
              console.error(`Error sending warning for subscription ${subscription.id}:`, error);
              results.errors++;
            }
          }
        }
      }

      console.log(`✅ [SubscriptionService] Expiry warnings completed:`, results);
      return results;

    } catch (error) {
      console.error('[SubscriptionService] Error sending expiry warnings:', error);
      results.errors++;
      return results;
    }
  }

  /**
   * Gets subscription statistics for monitoring
   */
  static async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    expired: number;
    cancelled: number;
    expiring_soon: number;
  }> {
    try {
      const supabase = getServiceSupabase();
      
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('status, expires_at');

      if (error) {
        console.error('Error fetching subscription stats:', error);
        return { total: 0, active: 0, trial: 0, expired: 0, cancelled: 0, expiring_soon: 0 };
      }

      const stats = {
        total: subscriptions?.length || 0,
        active: 0,
        trial: 0,
        expired: 0,
        cancelled: 0,
        expiring_soon: 0
      };

      const now = new Date();
      const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      subscriptions?.forEach(sub => {
        stats[sub.status as keyof typeof stats]++;
        
        if (sub.expires_at && sub.status === 'active') {
          const expiresAt = new Date(sub.expires_at);
          if (expiresAt <= soonThreshold) {
            stats.expiring_soon++;
          }
        }
      });

      return stats;

    } catch (error) {
      console.error('[SubscriptionService] Error getting subscription stats:', error);
      return { total: 0, active: 0, trial: 0, expired: 0, cancelled: 0, expiring_soon: 0 };
    }
  }

  /**
   * Logs subscription status changes for audit trail
   */
  private static async logStatusChange(
    userId: string,
    subscriptionId: string,
    oldStatus: string,
    newStatus: string,
    reason: string
  ): Promise<void> {
    try {
      const supabase = getServiceSupabase();
      
      await supabase.from('customer_lifecycle_events').insert({
        user_id: userId,
        subscription_id: subscriptionId,
        event_type: 'subscription_status_changed',
        status: 'completed',
        automated_action: 'status_update',
        action_completed_at: new Date().toISOString(),
        metadata: {
          old_status: oldStatus,
          new_status: newStatus,
          change_reason: reason,
          automated: true
        }
      });

    } catch (error) {
      console.error('Error logging status change:', error);
    }
  }

  /**
   * Sends expiry warning to user
   */
  private static async sendExpiryWarning(
    userId: string,
    handbookId: string,
    daysUntilExpiry: number
  ): Promise<void> {
    try {
      console.log(`📧 [SubscriptionService] Sending ${daysUntilExpiry}-day expiry warning to user ${userId}`);
      
      // Here you would integrate with your email service
      // For now, we'll just schedule it as an automated action
      const supabase = getServiceSupabase();
      
      await supabase.from('automated_actions_queue').insert({
        action_type: 'send_expiry_warning',
        target_user_id: userId,
        target_handbook_id: handbookId,
        scheduled_for: new Date().toISOString(),
        priority: daysUntilExpiry <= 1 ? 1 : daysUntilExpiry <= 3 ? 2 : 3,
        metadata: {
          days_until_expiry: daysUntilExpiry,
          warning_type: 'subscription_expiry'
        }
      });

    } catch (error) {
      console.error('Error sending expiry warning:', error);
    }
  }
}

/**
 * Utility functions for backward compatibility
 */
export async function getSubscriptionStatus(userId: string, handbookId: string): Promise<SubscriptionStatus> {
  const result = await AccessController.getSubscriptionStatus(userId, handbookId);
  return result;
}

export async function checkSubscriptionExpiry(userId: string, handbookId: string): Promise<boolean> {
  const healthCheck = await SubscriptionService.performHealthCheck(userId, handbookId);
  return healthCheck.expiresInDays !== null && healthCheck.expiresInDays <= 0;
} 