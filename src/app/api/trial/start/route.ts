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

    // Debug: Log template data
    console.log('[Trial Start] Template data received:', {
      hasTemplate: !!template,
      sectionsCount: template?.sections?.length || 0,
      sectionTitles: template?.sections?.map((s: any) => s.title) || [],
      fullTemplate: template // Add full template for debugging
    });

    // Kontrollera om användaren är superadmin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_superadmin')
      .eq('id', userId)
      .single();

    const isSuperAdmin = profile?.is_superadmin || false;
    
    console.log('[Trial Start] User check:', {
      userId,
      isSuperAdmin,
      profileError: profileError?.message
    });

    // Kontrollera om användaren är berättigad till trial (hoppa över för superadmins)
    if (!isSuperAdmin) {
      const eligible = await isEligibleForTrial(userId);
      
      if (!eligible) {
        return NextResponse.json(
          { error: 'User is not eligible for trial' },
          { status: 400 }
        );
      }
    } else {
      console.log('[Trial Start] Superadmin detected, skipping trial eligibility check');
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

    let trialProfile = null;
    let message = '';
    
    // Starta trial för användaren (hoppa över för superadmins)
    if (!isSuperAdmin) {
      trialProfile = await startUserTrial(userId, user.user?.email);
      
      if (!trialProfile) {
        return NextResponse.json(
          { error: 'Failed to start trial' },
          { status: 500 }
        );
      }
      message = '30 dagars gratis trial startad! Din handbok har skapats.';
    } else {
      message = 'Din handbok har skapats som superadmin.';
      console.log('[Trial Start] Skipping trial start for superadmin');
    }

    // Skapa handbok med trial-flaggor (false för superadmins)
    const handbookId = await createHandbookWithSectionsAndPages(
      name,        // name: string
      subdomain,   // slug: string  
      userId,      // userId?: string
      !isSuperAdmin, // isTrialHandbook: boolean = true (false för superadmins)
      template     // customTemplate?: any - Pass the AI template data
    );

    return NextResponse.json({
      success: true,
      message,
      handbookId,
      subdomain,
      trialEndsAt: trialProfile?.trial_ends_at || null,
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