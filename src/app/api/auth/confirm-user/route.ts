import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createHmac } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token, userId, email, timestamp, joinCode } = await request.json();

    // Validate required fields
    if (!token || !userId || !email || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: token, userId, email, timestamp' },
        { status: 400 }
      );
    }

    console.log('[Auth API] Confirming user:', { userId, email, hasJoinCode: !!joinCode });

    // Double-check token validity server-side for security
    // Check timestamp age (24 hours max)
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (now - tokenTime > maxAge) {
      console.error('[Auth API] Token expired');
      return NextResponse.json(
        { error: 'Confirmation link has expired. Please request a new confirmation.' },
        { status: 400 }
      );
    }

    // Verify token using same logic as verify-email-token endpoint
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'fallback-secret';
    const payload = `${userId}:${email}:${timestamp}`;
    const expectedToken = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (token !== expectedToken) {
      console.error('[Auth API] Invalid token provided');
      return NextResponse.json(
        { error: 'Invalid confirmation token' },
        { status: 400 }
      );
    }

    // Confirm user with admin privileges (server-side only!)
    const { data: userData, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true
      }
    );

    if (confirmError) {
      console.error('[Auth API] Error confirming user:', confirmError);
      return NextResponse.json(
        { error: 'Failed to confirm user account', details: confirmError.message },
        { status: 500 }
      );
    }

    if (!userData?.user) {
      console.error('[Auth API] User data is null after confirmation');
      return NextResponse.json(
        { error: 'User confirmation failed - no user data returned' },
        { status: 500 }
      );
    }

    console.log('[Auth API] User confirmed successfully:', userData.user.email);

    // Handle join code if provided
    let joinResult = null;
    if (joinCode) {
      console.log('[Auth API] Processing join code:', joinCode);
      
      try {
        const joinResponse = await fetch(`${request.nextUrl.origin}/api/handbook/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ 
            joinCode,
            userId 
          }),
        });

        if (joinResponse.ok) {
          joinResult = await joinResponse.json();
          console.log('[Auth API] Join successful:', joinResult);
        } else {
          const joinError = await joinResponse.text();
          console.error('[Auth API] Join failed:', joinError);
          // Don't fail the whole request if join fails - user is still confirmed
        }
      } catch (joinError) {
        console.error('[Auth API] Join request failed:', joinError);
        // Continue - user confirmation is more important
      }
    }

    return NextResponse.json({
      success: true,
      userConfirmed: true,
      joinResult,
      message: 'User confirmed successfully'
    });

  } catch (error) {
    console.error('[Auth API] Error in confirm-user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 