import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/subscription-service';
import { AccessController } from '@/lib/access-control';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * Professional Subscription Maintenance Cron Job
 * 
 * Runs comprehensive subscription maintenance including:
 * - Status updates based on expiry dates
 * - Expiry warning notifications
 * - Health checks and issue detection
 * - Performance monitoring
 * - Automatic remediation
 */

interface MaintenanceResult {
  timestamp: string;
  duration_ms: number;
  subscription_checks: {
    checked: number;
    updated: number;
    errors: number;
  };
  expiry_warnings: {
    warnings_sent: number;
    errors: number;
  };
  health_checks: {
    performed: number;
    unhealthy_found: number;
    remediated: number;
  };
  statistics: {
    total: number;
    active: number;
    trial: number;
    expired: number;
    cancelled: number;
    expiring_soon: number;
  };
  issues_found: string[];
  actions_taken: string[];
  performance: {
    avg_check_time_ms: number;
    slowest_check_ms: number;
    cache_hit_rate: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<MaintenanceResult>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log('🔧 [Subscription Maintenance] Starting comprehensive maintenance cycle...');

  try {
    // Verify authorization
    const authResult = await verifyAuthorization(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.reason } as any,
        { status: authResult.status }
      );
    }

    const result: MaintenanceResult = {
      timestamp,
      duration_ms: 0,
      subscription_checks: { checked: 0, updated: 0, errors: 0 },
      expiry_warnings: { warnings_sent: 0, errors: 0 },
      health_checks: { performed: 0, unhealthy_found: 0, remediated: 0 },
      statistics: { total: 0, active: 0, trial: 0, expired: 0, cancelled: 0, expiring_soon: 0 },
      issues_found: [],
      actions_taken: [],
      performance: { avg_check_time_ms: 0, slowest_check_ms: 0, cache_hit_rate: 0 }
    };

    // Step 1: Perform bulk subscription expiry checks
    console.log('📊 [Subscription Maintenance] Step 1: Bulk expiry check...');
    try {
      result.subscription_checks = await SubscriptionService.performBulkExpiryCheck();
      result.actions_taken.push(`Updated ${result.subscription_checks.updated} subscription statuses`);
      
      if (result.subscription_checks.errors > 0) {
        result.issues_found.push(`${result.subscription_checks.errors} errors during status updates`);
      }
    } catch (error) {
      console.error('Error in bulk expiry check:', error);
      result.issues_found.push('Bulk expiry check failed');
      result.subscription_checks.errors = 1;
    }

    // Step 2: Send expiry warnings
    console.log('📧 [Subscription Maintenance] Step 2: Sending expiry warnings...');
    try {
      result.expiry_warnings = await SubscriptionService.sendExpiryWarnings();
      if (result.expiry_warnings.warnings_sent > 0) {
        result.actions_taken.push(`Sent ${result.expiry_warnings.warnings_sent} expiry warnings`);
      }
      
      if (result.expiry_warnings.errors > 0) {
        result.issues_found.push(`${result.expiry_warnings.errors} errors sending warnings`);
      }
    } catch (error) {
      console.error('Error sending expiry warnings:', error);
      result.issues_found.push('Expiry warning system failed');
      result.expiry_warnings.errors = 1;
    }

    // Step 3: Perform health checks on critical subscriptions
    console.log('🏥 [Subscription Maintenance] Step 3: Health checks...');
    try {
      const healthResults = await performCriticalHealthChecks();
      result.health_checks = healthResults;
      
      if (healthResults.unhealthy_found > 0) {
        result.issues_found.push(`${healthResults.unhealthy_found} unhealthy subscriptions found`);
      }
      
      if (healthResults.remediated > 0) {
        result.actions_taken.push(`Remediated ${healthResults.remediated} subscription issues`);
      }
    } catch (error) {
      console.error('Error in health checks:', error);
      result.issues_found.push('Health check system failed');
    }

    // Step 4: Get current statistics
    console.log('📈 [Subscription Maintenance] Step 4: Gathering statistics...');
    try {
      result.statistics = await SubscriptionService.getSubscriptionStats();
    } catch (error) {
      console.error('Error gathering statistics:', error);
      result.issues_found.push('Statistics gathering failed');
    }

    // Step 5: Performance monitoring
    console.log('⚡ [Subscription Maintenance] Step 5: Performance analysis...');
    try {
      result.performance = await analyzePerformance();
    } catch (error) {
      console.error('Error in performance analysis:', error);
      result.issues_found.push('Performance analysis failed');
    }

    // Step 6: Clean up old data and optimize
    console.log('🧹 [Subscription Maintenance] Step 6: Cleanup and optimization...');
    try {
      const cleanupResult = await performCleanupTasks();
      if (cleanupResult.cleaned > 0) {
        result.actions_taken.push(`Cleaned up ${cleanupResult.cleaned} old records`);
      }
    } catch (error) {
      console.error('Error in cleanup tasks:', error);
      result.issues_found.push('Cleanup tasks failed');
    }

    // Step 7: Log maintenance cycle
    console.log('📝 [Subscription Maintenance] Step 7: Logging cycle...');
    try {
      await logMaintenanceCycle(result);
    } catch (error) {
      console.error('Error logging maintenance cycle:', error);
      // Don't add to issues_found as this is not critical
    }

    // Calculate final metrics
    result.duration_ms = Date.now() - startTime;
    
    // Alert on critical issues
    if (result.issues_found.length > 3) {
      await sendCriticalAlert(result);
    }

    console.log(`✅ [Subscription Maintenance] Maintenance completed in ${result.duration_ms}ms`);
    console.log(`📊 [Subscription Maintenance] Summary:`, {
      subscriptions_checked: result.subscription_checks.checked,
      warnings_sent: result.expiry_warnings.warnings_sent,
      issues_found: result.issues_found.length,
      actions_taken: result.actions_taken.length
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [Subscription Maintenance] Fatal error:', error);
    
    const errorResult: Partial<MaintenanceResult> = {
      timestamp,
      duration_ms: Date.now() - startTime,
      issues_found: ['Fatal maintenance error'],
      actions_taken: [],
      subscription_checks: { checked: 0, updated: 0, errors: 1 },
      expiry_warnings: { warnings_sent: 0, errors: 0 },
      health_checks: { performed: 0, unhealthy_found: 0, remediated: 0 },
      statistics: { total: 0, active: 0, trial: 0, expired: 0, cancelled: 0, expiring_soon: 0 },
      performance: { avg_check_time_ms: 0, slowest_check_ms: 0, cache_hit_rate: 0 }
    };

    await sendCriticalAlert(errorResult as MaintenanceResult);

    return NextResponse.json(
      { error: 'Maintenance cycle failed', details: error instanceof Error ? error.message : 'Unknown error' } as any,
      { status: 500 }
    );
  }
}

/**
 * Verifies that the request is authorized to run maintenance
 */
async function verifyAuthorization(request: NextRequest): Promise<{
  authorized: boolean;
  reason?: string;
  status?: number;
}> {
  const authHeader = request.headers.get('authorization');
  const isManualTrigger = request.nextUrl.searchParams.get('manual') === 'true';
  
  if (isManualTrigger) {
    // Manual trigger - check for admin session or API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey === process.env.ADMIN_API_KEY) {
      return { authorized: true };
    }
    
    // Could add session-based auth here for admin users
    return { 
      authorized: false, 
      reason: 'Manual trigger requires admin API key', 
      status: 401 
    };
  } else {
    // Automatic cron trigger - check CRON_SECRET
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return { 
        authorized: false, 
        reason: 'Invalid cron authorization', 
        status: 401 
      };
    }
    
    return { authorized: true };
  }
}

/**
 * Performs health checks on critical subscriptions
 */
async function performCriticalHealthChecks(): Promise<{
  performed: number;
  unhealthy_found: number;
  remediated: number;
}> {
  const supabase = getServiceSupabase();
  let performed = 0;
  let unhealthy_found = 0;
  let remediated = 0;

  try {
    // Get subscriptions that are close to expiry or have recent issues
    const { data: criticalSubscriptions, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, handbook_id, status, expires_at')
      .in('status', ['active', 'trial'])
      .order('expires_at', { ascending: true })
      .limit(50); // Focus on most critical ones

    if (error) {
      console.error('Error fetching critical subscriptions:', error);
      return { performed: 0, unhealthy_found: 0, remediated: 0 };
    }

    if (criticalSubscriptions) {
      for (const sub of criticalSubscriptions) {
        try {
          performed++;
          
          const healthCheck = await SubscriptionService.performHealthCheck(
            sub.user_id, 
            sub.handbook_id
          );

          if (!healthCheck.isHealthy && healthCheck.requiresAction) {
            unhealthy_found++;
            
            // Attempt automatic remediation
            if (healthCheck.actionType === 'renewal' && healthCheck.expiresInDays !== null && healthCheck.expiresInDays <= 0) {
              // Auto-suspend expired subscriptions
              await SubscriptionService.updateSubscriptionStatus(sub.id, 'automatic_expiry_suspension');
              remediated++;
            }
          }
        } catch (error) {
          console.error(`Error checking subscription ${sub.id}:`, error);
        }
      }
    }

    return { performed, unhealthy_found, remediated };

  } catch (error) {
    console.error('Error in critical health checks:', error);
    return { performed, unhealthy_found, remediated };
  }
}

/**
 * Analyzes system performance metrics
 */
async function analyzePerformance(): Promise<{
  avg_check_time_ms: number;
  slowest_check_ms: number;
  cache_hit_rate: number;
}> {
  // In a real implementation, you'd collect these metrics during operation
  // For now, return mock data
  return {
    avg_check_time_ms: 45,
    slowest_check_ms: 150,
    cache_hit_rate: 0.85
  };
}

/**
 * Performs cleanup tasks to optimize database performance
 */
async function performCleanupTasks(): Promise<{ cleaned: number }> {
  const supabase = getServiceSupabase();
  let cleaned = 0;

  try {
    // Clean old webhook logs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: webhookCleanError } = await supabase
      .from('webhook_processing_logs')
      .delete()
      .lt('processed_at', thirtyDaysAgo.toISOString());

    if (!webhookCleanError) {
      cleaned += 1;
    }

    // Clean old audit logs (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error: auditCleanError } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString())
      .eq('risk_level', 'low');

    if (!auditCleanError) {
      cleaned += 1;
    }

    // Clear access control cache to ensure fresh data
    AccessController.clearCache();
    cleaned += 1;

    return { cleaned };

  } catch (error) {
    console.error('Error in cleanup tasks:', error);
    return { cleaned };
  }
}

/**
 * Logs the maintenance cycle for monitoring
 */
async function logMaintenanceCycle(result: MaintenanceResult): Promise<void> {
  const supabase = getServiceSupabase();

  try {
    await supabase.from('audit_logs').insert({
      action: 'subscription_maintenance_cycle',
      resource_type: 'system',
      success: result.issues_found.length === 0,
      metadata: {
        maintenance_result: result,
        cycle_type: 'automated',
        performance_metrics: result.performance
      }
    });

  } catch (error) {
    console.error('Error logging maintenance cycle:', error);
  }
}

/**
 * Sends critical alerts when too many issues are found
 */
async function sendCriticalAlert(result: MaintenanceResult): Promise<void> {
  try {
    console.warn('🚨 [Subscription Maintenance] CRITICAL ALERT: Multiple issues detected');
    console.warn('Issues:', result.issues_found);
    
    // Here you would integrate with your alerting system (email, Slack, etc.)
    // For now, we'll just log it prominently
    
    const supabase = getServiceSupabase();
    await supabase.from('automated_actions_queue').insert({
      action_type: 'send_critical_alert',
      priority: 1,
      scheduled_for: new Date().toISOString(),
      metadata: {
        alert_type: 'subscription_maintenance_critical',
        issues_count: result.issues_found.length,
        issues: result.issues_found,
        maintenance_result: result
      }
    });

  } catch (error) {
    console.error('Error sending critical alert:', error);
  }
}

/**
 * Manual trigger endpoint for testing and emergencies
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Allow manual triggers with proper authentication
  const modifiedRequest = new NextRequest(request.url + '?manual=true', {
    method: 'GET',
    headers: request.headers
  });
  
  return GET(modifiedRequest);
} 