import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startUserTrial, isEligibleForTrial } from '@/lib/trial-service';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';

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

export async function POST(req: NextRequest) {
  try {
    const { handbookData } = await req.json();
    
    if (!handbookData) {
      return NextResponse.json(
        { error: 'Handbook data is required' },
        { status: 400 }
      );
    }

    const { name, subdomain, template, userId } = handbookData;

    if (!userId || !name || !subdomain) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Kontrollera om användaren är berättigad till trial
    const eligible = await isEligibleForTrial(userId);
    
    if (!eligible) {
      return NextResponse.json(
        { error: 'User is not eligible for trial' },
        { status: 400 }
      );
    }

    // Hämta användarens email från auth.users med service role
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Starta trial för användaren
    const trialProfile = await startUserTrial(userId, user.user?.email);
    
    if (!trialProfile) {
      return NextResponse.json(
        { error: 'Failed to start trial' },
        { status: 500 }
      );
    }

    // Skapa handbok med trial-flaggor
    const handbookId = await createHandbookWithSectionsAndPages(
      name,        // name: string
      subdomain,   // slug: string  
      userId,      // userId?: string
      true         // isTrialHandbook: boolean = true
    );

    return NextResponse.json({
      success: true,
      message: '30 dagars gratis trial startad! Din handbok har skapats.',
      handbookId,
      subdomain,
      trialEndsAt: trialProfile.trial_ends_at,
      redirectUrl: `/${subdomain}`
    });

  } catch (error) {
    console.error('Error starting trial:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start trial',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 