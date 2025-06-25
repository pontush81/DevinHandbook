import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handbookId = searchParams.get('handbookId');
    const userId = searchParams.get('userId');
    
    if (!handbookId || !userId) {
      return NextResponse.json({ error: 'Missing handbookId or userId' }, { status: 400 });
    }

    // Get handbook data
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, title, created_at, trial_end_date, created_during_trial, owner_id')
      .eq('id', handbookId)
      .single();

    if (handbookError) {
      return NextResponse.json({ error: handbookError.message }, { status: 500 });
    }

    // Get subscriptions for this specific handbook
    const { data: handbookSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('handbook_id', handbookId);

    // Get all subscriptions for this user
    const { data: allSubscriptions, error: allSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    return NextResponse.json({
      handbook,
      handbookSubscriptions: handbookSubscriptions || [],
      allUserSubscriptions: allSubscriptions || [],
      ...handbook // Spread handbook data to top level for easy access
    });

  } catch (error) {
    console.error('Error fetching handbook debug data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 