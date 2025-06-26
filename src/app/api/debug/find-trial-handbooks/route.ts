import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Find all handbooks for the user
    const { data: handbooks, error } = await supabase
      .from('handbooks')
      .select('id, title, slug, trial_end_date, created_during_trial, created_at, updated_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Categorize handbooks
    const trialHandbooks = handbooks?.filter(h => h.trial_end_date !== null) || [];
    const paidHandbooks = handbooks?.filter(h => h.trial_end_date === null) || [];

    // Get subscriptions for these handbooks
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, handbook_id, status, plan_type, created_at')
      .eq('user_id', userId);

    if (subError) {
      console.warn('Failed to fetch subscriptions:', subError);
    }

    console.log('📊 [Find Trial Handbooks] Results for user:', userId);
    console.log('📊 [Find Trial Handbooks] Total handbooks:', handbooks?.length || 0);
    console.log('📊 [Find Trial Handbooks] Trial handbooks:', trialHandbooks.length);
    console.log('📊 [Find Trial Handbooks] Paid handbooks:', paidHandbooks.length);
    console.log('📊 [Find Trial Handbooks] Subscriptions:', subscriptions?.length || 0);

    return NextResponse.json({
      userId,
      total: handbooks?.length || 0,
      trialHandbooks,
      paidHandbooks,
      subscriptions: subscriptions || [],
      summary: {
        totalHandbooks: handbooks?.length || 0,
        trialCount: trialHandbooks.length,
        paidCount: paidHandbooks.length,
        subscriptionCount: subscriptions?.length || 0
      }
    });

  } catch (error) {
    console.error('Error finding trial handbooks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to find trial handbooks', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 