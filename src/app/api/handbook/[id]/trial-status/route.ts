import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const providedUserId = searchParams.get('userId');
    const { id: handbookId } = await params;

    if (!handbookId) {
      return NextResponse.json(
        { error: 'Missing handbookId' },
        { status: 400 }
      );
    }

    // Try to get session from server-side cookies first
    const session = await getServerSession(request);
    
    // If no server session, try to get userId from Bearer token
    let userId = session?.user?.id || providedUserId;
    
    // Check if Authorization header has Bearer token
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Verify the token with Supabase
        const supabase = getServiceSupabase();
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) {
            userId = user.id;
            console.log('✅ [Trial Status] Authenticated via Bearer token:', userId);
          }
        } catch (error) {
          console.log('❌ [Trial Status] Bearer token verification failed:', error);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required - no valid session or token found' },
        { status: 401 }
      );
    }

    console.log('📊 [Trial Status] Checking status for:', { handbookId, userId, method: session ? 'cookie' : 'bearer' });

    const supabase = getServiceSupabase();

    // 1. First check if the user owns this handbook OR is an admin member
    const { data: handbookData, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, owner_id, trial_end_date, created_during_trial')
      .eq('id', handbookId)
      .single();

    if (handbookError || !handbookData) {
      return NextResponse.json(
        { 
          error: 'Handbook not found',
          details: handbookError?.message 
        },
        { status: 404 }
      );
    }

    // Check if user is owner, admin member, or any member
    const isOwner = handbookData.owner_id === userId;
    let userRole = null;

    if (!isOwner) {
      const { data: memberData, error: memberError } = await supabase
        .from('handbook_members')
        .select('role')
        .eq('handbook_id', handbookId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!memberError && memberData) {
        userRole = memberData.role;
      }
    }

    // Must be owner or member to access
    if (!isOwner && !userRole) {
      return NextResponse.json(
        { 
          error: 'Access denied - must be handbook member',
        },
        { status: 403 }
      );
    }

    // Determine permission level
    const hasFullAccess = isOwner || userRole === 'admin';
    const hasBasicAccess = !!userRole; // editor or viewer

    // Use handbookData instead of handbookOwnership
    const handbookOwnership = handbookData;

    // 2. Check for handbook-specific subscriptions (only for full access users)
    let subscriptions = null;
    
    if (hasFullAccess) {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('status, plan_type, expires_at, trial_ends_at, cancelled_at')
        .eq('user_id', handbookData.owner_id) // Check owner's subscriptions, not requesting user
        .eq('handbook_id', handbookId)
        .in('status', ['active', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (subError) {
        console.error('Error checking subscriptions:', subError);
      } else {
        subscriptions = subData;
      }
    }

    // 3. Determine trial status
    let trialStatus;

    // If there's an active subscription for this handbook
    if (subscriptions && subscriptions.length > 0) {
      const subscription = subscriptions[0];
      
      if (subscription.status === 'active') {
        trialStatus = {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'active',
          trialEndsAt: subscription.trial_ends_at,
          canCreateHandbook: true,
          hasUsedTrial: true,
          isPaid: true,
          hasActiveSubscription: true,
          subscriptionCount: 1
        };
      } else if (subscription.status === 'cancelled') {
        trialStatus = {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'cancelled',
          trialEndsAt: subscription.trial_ends_at,
          canCreateHandbook: false,
          hasUsedTrial: true,
          isPaid: false,
          hasActiveSubscription: false,
          subscriptionCount: 1
        };
      }
    } else {
      // No subscription, check handbook's trial_end_date
      if (!handbookOwnership.trial_end_date) {
        // No trial_end_date means it's fully paid
        trialStatus = {
          isInTrial: false,
          trialDaysRemaining: 0,
          subscriptionStatus: 'active',
          trialEndsAt: null,
          canCreateHandbook: true,
          hasUsedTrial: handbookOwnership.created_during_trial || false,
          isPaid: true,
          hasActiveSubscription: false,
          subscriptionCount: 0
        };
      } else {
        // Check if trial is still active
        const trialEndDate = new Date(handbookOwnership.trial_end_date);
        const now = new Date();
        const isStillInTrial = trialEndDate > now;
        const trialDaysRemaining = isStillInTrial ? 
          Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        trialStatus = {
          isInTrial: isStillInTrial,
          trialDaysRemaining: Math.max(0, trialDaysRemaining),
          subscriptionStatus: isStillInTrial ? 'trial' : 'expired',
          trialEndsAt: handbookOwnership.trial_end_date,
          canCreateHandbook: true,
          hasUsedTrial: handbookOwnership.created_during_trial || false,
          isPaid: false,
          hasActiveSubscription: false,
          subscriptionCount: 0
        };
      }
    }

    // console.log('✅ [Handbook Status] Result:', trialStatus);

    // Return different information based on access level
    if (hasBasicAccess && !hasFullAccess) {
      // For viewers/editors: return only basic availability information
      return NextResponse.json({
        isInTrial: trialStatus.isInTrial,
        subscriptionStatus: trialStatus.subscriptionStatus,
        canCreateHandbook: false, // Only owners/admins can create
        isPaid: trialStatus.isPaid,
        hasActiveSubscription: trialStatus.hasActiveSubscription,
        // Limited information for privacy
        trialDaysRemaining: trialStatus.isInTrial ? trialStatus.trialDaysRemaining : 0,
        trialEndsAt: trialStatus.isInTrial ? trialStatus.trialEndsAt : null,
        hasUsedTrial: false, // Hide this detail
        subscriptionCount: 0 // Hide this detail
      });
    }

    // For owners/admins: return full information
    return NextResponse.json(trialStatus);

  } catch (error) {
    console.error('Error in handbook trial status API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 