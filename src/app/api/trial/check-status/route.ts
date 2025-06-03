import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client för admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'UserId is required' },
        { status: 400 }
      );
    }

    // Använd check_trial_status funktion med admin privileges
    const { data, error } = await supabaseAdmin
      .rpc('check_trial_status', { user_id: userId });

    if (error) {
      console.error('Error checking trial status:', error);
      return NextResponse.json(
        { error: 'Failed to check trial status' },
        { status: 500 }
      );
    }

    const result = data[0];
    
    // Kontrollera också om användaren har handböcker
    const { data: handbooks, error: handbooksError } = await supabaseAdmin
      .from('handbooks')
      .select('id, created_during_trial')
      .eq('owner_id', userId);

    if (handbooksError) {
      console.error('Error fetching handbooks:', handbooksError);
    }

    const hasHandbooks = handbooks && handbooks.length > 0;
    const hasTrialHandbook = handbooks?.some(h => h.created_during_trial) || false;

    return NextResponse.json({
      isInTrial: result?.is_in_trial || false,
      trialDaysRemaining: result?.trial_days_remaining || 0,
      subscriptionStatus: result?.subscription_status || 'none',
      trialEndsAt: result?.trial_ends_at || null,
      canCreateHandbook: !hasHandbooks || result?.is_in_trial || result?.subscription_status === 'active',
      hasUsedTrial: hasTrialHandbook
    });

  } catch (error) {
    console.error('Error in trial check-status API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const trialStatus = await getTrialStatus(userId);

    return NextResponse.json({
      success: true,
      trialStatus
    });

  } catch (error) {
    console.error('Error checking trial status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check trial status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 