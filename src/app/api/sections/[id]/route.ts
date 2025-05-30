import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sectionId = params.id;
    const updates = await request.json();

    console.log('🔄 [API] Updating section:', sectionId, updates);

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Error updating section:', error);
      return NextResponse.json(
        { error: 'Failed to update section', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Section updated successfully:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 