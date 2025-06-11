import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  // DEPRECATED: This endpoint is deprecated in favor of /api/auth/confirm-user
  // Only allow in development and log deprecation warning
  if (process.env.NODE_ENV !== 'development') {
    console.error('[SECURITY] Attempt to access dev endpoint in production blocked');
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  console.warn('[DEPRECATED] /api/dev/confirm-user is deprecated. Use /api/auth/confirm-user instead.');

  try {
    const { userId, joinCode } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[Dev API] Confirming user:', userId, 'with join code:', joinCode);

    // Försök bekräfta användaren med retry-logik (ibland behöver Supabase lite tid)
    let userData;
    let confirmError;
    
    for (let attempts = 0; attempts < 5; attempts++) {
      if (attempts > 0) {
        console.log(`[Dev API] Retry attempt ${attempts + 1} for user:`, userId);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Vänta 1.5 sekunder
      }
      
      // Först, kontrollera om användaren existerar
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (getUserError || !existingUser) {
        console.log(`[Dev API] User not found yet, attempt ${attempts + 1}:`, getUserError?.message);
        continue; // Försök igen
      }
      
      console.log(`[Dev API] User exists, confirming email for:`, existingUser.user?.email);
      
      const result = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          email_confirm: true
        }
      );
      
      userData = result.data;
      confirmError = result.error;
      
      if (!confirmError) {
        break; // Lyckades!
      }
      
      console.log(`[Dev API] Attempt ${attempts + 1} failed:`, confirmError);
    }

    if (confirmError) {
      console.error('[Dev API] Error confirming user:', confirmError);
      return NextResponse.json(
        { error: 'Failed to confirm user', details: confirmError.message },
        { status: 500 }
      );
    }

    if (!userData || !userData.user) {
      console.error('[Dev API] User data is null or invalid after confirmation');
      return NextResponse.json(
        { error: 'User confirmation completed but user data is invalid' },
        { status: 500 }
      );
    }

    console.log('[Dev API] User confirmed successfully:', userData.user?.email);

    // If there's a join code, process it
    if (joinCode) {
      console.log('[Dev API] Processing join code:', joinCode);
      
      // Call the join API as the newly confirmed user
      const joinResponse = await fetch(`${request.nextUrl.origin}/api/handbook/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ 
          joinCode,
          userId // Pass the user ID directly in dev mode
        }),
      });

      if (!joinResponse.ok) {
        const joinError = await joinResponse.text();
        console.error('[Dev API] Join failed:', joinError);
        return NextResponse.json(
          { 
            success: true, 
            userConfirmed: true, 
            joinSuccess: false,
            message: 'User confirmed but join failed',
            joinError 
          },
          { status: 200 }
        );
      }

      const joinResult = await joinResponse.json();
      console.log('[Dev API] Join successful:', joinResult);

      return NextResponse.json({
        success: true,
        userConfirmed: true,
        joinSuccess: true,
        message: 'User confirmed and joined successfully',
        joinResult
      });
    }

    return NextResponse.json({
      success: true,
      userConfirmed: true,
      message: 'User confirmed successfully'
    });

  } catch (error) {
    console.error('[Dev API] Error in confirm-user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 