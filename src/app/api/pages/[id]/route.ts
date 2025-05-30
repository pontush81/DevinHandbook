import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = params.id;
    const updates = await request.json();

    console.log('🔄 [API] Updating page:', pageId, updates);

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('pages')
      .update(updates)
      .eq('id', pageId)
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Error updating page:', error);
      return NextResponse.json(
        { error: 'Failed to update page', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Page updated successfully:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 