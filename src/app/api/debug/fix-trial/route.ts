import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    if (action === 'fix_trial') {
      // Set trial to start now and end in 30 days
      const now = new Date();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          trial_used: true,
          subscription_status: 'trial',
          updated_at: now.toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Trial dates fixed',
        data,
        newTrialEndsAt: trialEndsAt.toISOString(),
        daysRemaining: 30
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Fix trial error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 