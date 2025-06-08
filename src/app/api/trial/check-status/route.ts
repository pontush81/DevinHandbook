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

    // Hämta användarens trial-status direkt från user_profiles
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Om användaren inte har en profil, skapa en med default trial
      if (profileError.code === 'PGRST116') {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);
        
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: userId,
            trial_started_at: new Date().toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
            trial_used: false,
            subscription_status: 'trial'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          );
        }
        
        // Använd den nya profilen för beräkningar
        const trialDaysRemaining = Math.max(0, Math.ceil((new Date(newProfile.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        
        return NextResponse.json({
          isInTrial: true,
          trialDaysRemaining,
          subscriptionStatus: 'trial',
          trialEndsAt: newProfile.trial_ends_at,
          canCreateHandbook: true,
          hasUsedTrial: false
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch user profile' },
          { status: 500 }
        );
      }
    }

    // Beräkna trial-status
    const now = new Date();
    const isInTrial = userProfile.subscription_status === 'trial' 
      && userProfile.trial_ends_at 
      && new Date(userProfile.trial_ends_at) > now;
    
    const trialDaysRemaining = userProfile.trial_ends_at 
      ? Math.max(0, Math.ceil((new Date(userProfile.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    
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
      isInTrial,
      trialDaysRemaining,
      subscriptionStatus: userProfile.subscription_status || 'none',
      trialEndsAt: userProfile.trial_ends_at,
      canCreateHandbook: !hasHandbooks || isInTrial || userProfile.subscription_status === 'active',
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

    // Använd samma logik som GET-metoden
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Beräkna trial-status
    const now = new Date();
    const isInTrial = userProfile.subscription_status === 'trial' 
      && userProfile.trial_ends_at 
      && new Date(userProfile.trial_ends_at) > now;
    
    const trialDaysRemaining = userProfile.trial_ends_at 
      ? Math.max(0, Math.ceil((new Date(userProfile.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return NextResponse.json({
      success: true,
      trialStatus: {
        isInTrial,
        trialDaysRemaining,
        subscriptionStatus: userProfile.subscription_status || 'none',
        trialEndsAt: userProfile.trial_ends_at
      }
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