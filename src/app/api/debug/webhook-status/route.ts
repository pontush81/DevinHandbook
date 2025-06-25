import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    
    // Get webhook processing statistics for the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Overall statistics
    const { data: stats, error: statsError } = await supabase
      .from('webhook_processing_logs')
      .select('success, processing_time_ms, event_type')
      .gte('processed_at', twentyFourHoursAgo);
    
    if (statsError) {
      console.error('Error fetching webhook stats:', statsError);
      return NextResponse.json({ error: 'Failed to fetch webhook statistics' }, { status: 500 });
    }
    
    // Recent failures (last 10)
    const { data: recentFailures, error: failuresError } = await supabase
      .from('webhook_processing_logs')
      .select('*')
      .eq('success', false)
      .order('processed_at', { ascending: false })
      .limit(10);
    
    if (failuresError) {
      console.error('Error fetching recent failures:', failuresError);
      return NextResponse.json({ error: 'Failed to fetch recent failures' }, { status: 500 });
    }
    
    // Process statistics
    const totalEvents = stats?.length || 0;
    const successfulEvents = stats?.filter(s => s.success).length || 0;
    const failedEvents = totalEvents - successfulEvents;
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents * 100).toFixed(1) : '0';
    
    // Average processing time
    const processingTimes = stats?.filter(s => s.processing_time_ms).map(s => s.processing_time_ms) || [];
    const avgProcessingTime = processingTimes.length > 0 
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 0;
    
    // Event type breakdown
    const eventTypes = stats?.reduce((acc: any, stat) => {
      acc[stat.event_type] = (acc[stat.event_type] || 0) + 1;
      return acc;
    }, {}) || {};
    
    // Critical events (checkout.session.completed) in last 24h
    const criticalEvents = stats?.filter(s => s.event_type === 'checkout.session.completed') || [];
    const criticalSuccessRate = criticalEvents.length > 0 
      ? (criticalEvents.filter(e => e.success).length / criticalEvents.length * 100).toFixed(1)
      : '100';
    
    return NextResponse.json({
      summary: {
        totalEvents,
        successfulEvents,
        failedEvents,
        successRate: `${successRate}%`,
        avgProcessingTimeMs: avgProcessingTime,
        criticalEventsCount: criticalEvents.length,
        criticalSuccessRate: `${criticalSuccessRate}%`
      },
      eventTypes,
      recentFailures: recentFailures?.map(failure => ({
        eventType: failure.event_type,
        eventId: failure.event_id,
        errorMessage: failure.error_message,
        processingTimeMs: failure.processing_time_ms,
        retryCount: failure.retry_count,
        processedAt: failure.processed_at,
        testMode: failure.test_mode
      })) || [],
      recommendations: generateRecommendations(stats || [], recentFailures || [])
    });
    
  } catch (error) {
    console.error('Error in webhook status endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateRecommendations(stats: any[], failures: any[]): string[] {
  const recommendations: string[] = [];
  
  const totalEvents = stats.length;
  const failedEvents = stats.filter(s => !s.success).length;
  const failureRate = totalEvents > 0 ? (failedEvents / totalEvents) : 0;
  
  // High failure rate
  if (failureRate > 0.1) {
    recommendations.push(`⚠️ High failure rate (${(failureRate * 100).toFixed(1)}%) - Check Stripe webhook configuration`);
  }
  
  // Recent critical failures
  const recentCriticalFailures = failures.filter(f => 
    f.event_type === 'checkout.session.completed' && 
    new Date(f.processed_at) > new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
  );
  
  if (recentCriticalFailures.length > 0) {
    recommendations.push(`🚨 ${recentCriticalFailures.length} critical payment webhook(s) failed in last 2 hours - Immediate attention required`);
  }
  
  // Slow processing
  const processingTimes = stats.filter(s => s.processing_time_ms).map(s => s.processing_time_ms);
  const avgTime = processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
  
  if (avgTime > 5000) {
    recommendations.push(`⏱️ Slow webhook processing (${Math.round(avgTime)}ms avg) - Consider optimizing database queries`);
  }
  
  // Signature verification failures
  const signatureFailures = failures.filter(f => f.event_type === 'signature_verification_failed');
  if (signatureFailures.length > 0) {
    recommendations.push(`🔐 ${signatureFailures.length} signature verification failures - Check webhook secret configuration`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push(`✅ Webhook system is operating normally`);
  }
  
  return recommendations;
} 