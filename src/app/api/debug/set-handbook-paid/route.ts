import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { markHandbookAsPaid, getHandbookStatus } from '@/lib/handbook-status';

export async function POST(request: NextRequest) {
  try {
    const { handbookId, userId } = await request.json();

    if (!handbookId || !userId) {
      return NextResponse.json(
        { error: 'Missing handbookId or userId' },
        { status: 400 }
      );
    }

    console.log('🎯 [Set Handbook Paid] Request:', { handbookId, userId });

    const supabase = getServiceSupabase();

    // Verify user is superadmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    const superadminEmails = ['pontus.hberg@gmail.com', 'pontusaiagent@gmail.com'];
    if (!profile || !superadminEmails.includes(profile.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - superadmin only' },
        { status: 403 }
      );
    }

    console.log('✅ [Set Handbook Paid] Superadmin verified:', profile.email);

    // Get status before
    const statusBefore = await getHandbookStatus(handbookId, userId);

    // Mark as paid using the new simple service
    await markHandbookAsPaid(handbookId);

    // Get status after
    const statusAfter = await getHandbookStatus(handbookId, userId);

    const response = {
      success: true,
      message: `Handbook has been marked as paid`,
      before: {
        trial_end_date: statusBefore.trialEndDate,
        status: statusBefore.isPaid ? 'paid' : 'trial'
      },
      after: {
        trial_end_date: statusAfter.trialEndDate,
        status: statusAfter.isPaid ? 'paid' : 'trial'
      },
      verification: {
        trial_end_date: statusAfter.trialEndDate
      },
      handbook: {
        id: handbookId,
        trial_end_date: statusAfter.trialEndDate,
        created_during_trial: true,
        owner_id: userId
      }
    };

    console.log('🎉 [Set Handbook Paid] Success:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Set Handbook Paid] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 