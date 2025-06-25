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

    // Get handbook info before update
    const { data: handbookBefore } = await supabase
      .from('handbooks')
      .select('id, title, trial_end_date, created_during_trial, owner_id')
      .eq('id', handbookId)
      .single();

    if (!handbookBefore) {
      return NextResponse.json(
        { error: 'Handbook not found' },
        { status: 404 }
      );
    }

    console.log('📖 [Set Handbook Paid] Handbook before:', handbookBefore);

    // Directly set trial_end_date to null (paid status)
    const { data: updatedHandbook, error: updateError } = await supabase
      .from('handbooks')
      .update({ 
        trial_end_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', handbookId)
      .select('id, title, trial_end_date, created_during_trial, owner_id')
      .single();

    if (updateError) {
      console.error('❌ [Set Handbook Paid] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update handbook', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Set Handbook Paid] Handbook updated:', updatedHandbook);

    // Verify the update worked
    const { data: verification } = await supabase
      .from('handbooks')
      .select('trial_end_date')
      .eq('id', handbookId)
      .single();

    console.log('🔍 [Set Handbook Paid] Verification:', verification);

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
      verification: verification,
      handbook: updatedHandbook
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