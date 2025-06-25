import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handbookId = searchParams.get('handbookId');
    const userId = searchParams.get('userId');

    if (!handbookId || !userId) {
      return NextResponse.json(
        { error: 'Missing handbookId or userId' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. Kolla handbok-data
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('*')
      .eq('id', handbookId)
      .single();

    // 2. Kolla subscriptions för denna handbok
    const { data: handbookSubscriptions, error: handbookSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 3. Kolla alla subscriptions för användaren
    const { data: userSubscriptions, error: userSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 4. Kolla customer lifecycle events
    const { data: lifecycleEvents, error: lifecycleError } = await supabase
      .from('customer_lifecycle_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      handbookId,
      userId,
      handbook: {
        data: handbook,
        error: handbookError
      },
      handbookSubscriptions: {
        data: handbookSubscriptions,
        error: handbookSubError
      },
      userSubscriptions: {
        data: userSubscriptions,
        error: userSubError
      },
      lifecycleEvents: {
        data: lifecycleEvents,
        error: lifecycleError
      },
      summary: {
        handbookTrialEndDate: handbook?.trial_end_date,
        handbookCreatedDuringTrial: handbook?.created_during_trial,
        activeHandbookSubscriptions: handbookSubscriptions?.filter(s => s.status === 'active').length || 0,
        totalUserSubscriptions: userSubscriptions?.length || 0,
        recentLifecycleEvents: lifecycleEvents?.length || 0
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
} 