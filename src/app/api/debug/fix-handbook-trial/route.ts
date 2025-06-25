import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { handbookId, userId } = await request.json();
    
    if (!handbookId || !userId) {
      return NextResponse.json({ error: 'Missing handbookId or userId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Calculate trial end date - 30 days from now
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    console.log(`🔧 Fixing trial data for handbook ${handbookId}`);

    // Update the handbook with correct trial information
    const { data, error } = await supabase
      .from('handbooks')
      .update({
        trial_end_date: trialEndDate.toISOString(),
        created_during_trial: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', handbookId)
      .eq('owner_id', userId) // Ensure user owns this handbook
      .select()
      .single();

    if (error) {
      console.error('Error updating handbook trial data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Successfully updated handbook trial data:`, {
      handbookId,
      trialEndDate: trialEndDate.toISOString(),
      createdDuringTrial: true
    });

    return NextResponse.json({
      success: true,
      message: 'Handbook trial data updated successfully',
      trialEndDate: trialEndDate.toISOString(),
      handbookData: data
    });

  } catch (error) {
    console.error('Error fixing handbook trial:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 