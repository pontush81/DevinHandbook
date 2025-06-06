import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sectionId } = await params;
    const updates = await request.json();

    console.log('🔄 [API] Updating section:', sectionId, 'with updates:', updates);

    // Map 'content' to 'description' since sections table doesn't have content column
    if (updates.content !== undefined) {
      updates.description = updates.content;
      delete updates.content;
      console.log('📝 [API] Mapped content to description for sections table');
    }

    const supabase = getServiceSupabase();
    
    // First check if the section exists
    const { data: existingSection, error: checkError } = await supabase
      .from('sections')
      .select('id, title')
      .eq('id', sectionId)
      .single();

    if (checkError || !existingSection) {
      console.error('❌ [API] Section not found:', sectionId, checkError?.message);
      return NextResponse.json(
        { 
          error: 'Section not found', 
          sectionId,
          details: checkError?.message || 'Section does not exist in database'
        },
        { status: 404 }
      );
    }

    console.log('✅ [API] Found existing section:', existingSection);
    
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

    if (!data) {
      console.error('❌ [API] No data returned from update for section:', sectionId);
      return NextResponse.json(
        { error: 'No data returned from update', sectionId },
        { status: 500 }
      );
    }

    console.log('✅ [API] Section updated successfully:', data);
    return NextResponse.json(data);

  } catch (error: any) {
    const sectionId = 'unknown';
    console.error('❌ [API] Unexpected error updating section:', {
      sectionId,
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 