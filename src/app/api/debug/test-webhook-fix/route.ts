import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { markHandbookAsPaid } from '@/lib/handbook-status';

// Debug endpoint to test webhook functionality
export async function POST(req: NextRequest) {
  try {
    const { handbookId, userId, simulateWebhook } = await req.json();
    
    if (!handbookId || !userId) {
      return NextResponse.json({ error: 'Missing handbookId or userId' }, { status: 400 });
    }

    console.log('🔧 [Debug Webhook Fix] Testing webhook fix for:', { handbookId, userId, simulateWebhook });

    const supabase = getServiceSupabase();
    const results = {
      before: null,
      after: null,
      webhookSimulation: null,
      subscriptions: null,
      error: null
    };

    // 1. Get current status
    const { data: beforeHandbook } = await supabase
      .from('handbooks')
      .select('id, title, trial_end_date, owner_id')
      .eq('id', handbookId)
      .single();

    results.before = beforeHandbook;

    // 2. Check existing subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('handbook_id', handbookId);

    results.subscriptions = subscriptions;

    // 3. Simulate webhook processing if requested
    if (simulateWebhook) {
      console.log('🎯 [Debug] Simulating webhook processing...');
      
      // Simulate the exact webhook logic
      try {
        await markHandbookAsPaid(handbookId);
        results.webhookSimulation = { success: true, message: 'Webhook simulation successful' };
      } catch (error) {
        results.webhookSimulation = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // 4. Get status after
    const { data: afterHandbook } = await supabase
      .from('handbooks')
      .select('id, title, trial_end_date, owner_id')
      .eq('id', handbookId)
      .single();

    results.after = afterHandbook;

    return NextResponse.json({
      success: true,
      handbookId,
      userId,
      results,
      analysis: {
        wasTrial: results.before?.trial_end_date !== null,
        isPaidNow: results.after?.trial_end_date === null,
        hasSubscriptions: (results.subscriptions?.length || 0) > 0,
        statusChanged: results.before?.trial_end_date !== results.after?.trial_end_date
      }
    });

  } catch (error) {
    console.error('❌ [Debug Webhook Fix] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support GET for quick status check
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const handbookId = url.searchParams.get('handbookId');
  const userId = url.searchParams.get('userId');

  if (!handbookId || !userId) {
    return NextResponse.json({ error: 'Missing handbookId or userId' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // Get handbook status
  const { data: handbook } = await supabase
    .from('handbooks')
    .select('id, title, trial_end_date, owner_id, created_at')
    .eq('id', handbookId)
    .single();

  // Get subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('handbook_id', handbookId);

  // Get recent lifecycle events
  const { data: events } = await supabase
    .from('customer_lifecycle_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    handbook,
    subscriptions,
    recentEvents: events,
    status: {
      isPaid: handbook?.trial_end_date === null,
      isInTrial: handbook?.trial_end_date !== null,
      hasSubscriptions: (subscriptions?.length || 0) > 0
    }
  });
} 