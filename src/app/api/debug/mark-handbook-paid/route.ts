import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { handbookId, userId } = await request.json();

    if (!handbookId || !userId) {
      return NextResponse.json(
        { error: 'Missing handbookId or userId' },
        { status: 400 }
      );
    }

    console.log('🎯 [Mark as Paid API] Request:', { handbookId, userId });

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

    console.log('✅ [Mark as Paid API] Superadmin verified:', profile.email);

    // Get handbook info before update
    const { data: handbookBefore } = await supabase
      .from('handbooks')
      .select('title, trial_end_date, created_during_trial, owner_id')
      .eq('id', handbookId)
      .single();

    if (!handbookBefore) {
      return NextResponse.json(
        { error: 'Handbook not found' },
        { status: 404 }
      );
    }

    console.log('📖 [Mark as Paid API] Handbook before:', handbookBefore);

    // Mark handbook as paid by setting trial_end_date to null
    const { data: updatedHandbook, error: updateError } = await supabase
      .from('handbooks')
      .update({ 
        trial_end_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', handbookId)
      .select('title, trial_end_date, created_during_trial, owner_id')
      .single();

    if (updateError) {
      console.error('❌ [Mark as Paid API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update handbook', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Mark as Paid API] Handbook updated:', updatedHandbook);

    // Create a lifecycle event to track this manual action
    const { error: lifecycleError } = await supabase
      .from('subscription_lifecycle_events')
      .insert({
        user_id: handbookBefore.owner_id,
        handbook_id: handbookId,
        event_type: 'manual_mark_paid',
        event_data: {
          marked_by_admin: userId,
          admin_email: profile.email,
          previous_trial_end_date: handbookBefore.trial_end_date,
          action: 'manual_payment_override'
        }
      });

    if (lifecycleError) {
      console.warn('⚠️ [Mark as Paid API] Failed to create lifecycle event:', lifecycleError);
    }

    const response = {
      success: true,
      message: `Handbook "${updatedHandbook.title}" has been marked as paid`,
      before: {
        trial_end_date: handbookBefore.trial_end_date,
        status: handbookBefore.trial_end_date ? 'trial' : 'paid'
      },
      after: {
        trial_end_date: updatedHandbook.trial_end_date,
        status: updatedHandbook.trial_end_date ? 'trial' : 'paid'
      },
      handbook: updatedHandbook
    };

    console.log('🎉 [Mark as Paid API] Success:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Mark as Paid API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 