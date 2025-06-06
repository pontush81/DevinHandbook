import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pageId } = await params;
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pageId } = await params;

    console.log('🗑️ [API] Deleting page:', pageId);

    const supabase = getServiceSupabase();
    
    // First check if the page exists
    const { data: existingPage, error: checkError } = await supabase
      .from('pages')
      .select('id, title, section_id')
      .eq('id', pageId)
      .single();

    if (checkError || !existingPage) {
      console.error('❌ [API] Page not found:', pageId, checkError?.message);
      return NextResponse.json(
        { 
          error: 'Page not found', 
          pageId,
          details: checkError?.message || 'Page does not exist in database'
        },
        { status: 404 }
      );
    }

    console.log('✅ [API] Found existing page:', existingPage);
    
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      console.error('❌ [API] Error deleting page:', error);
      return NextResponse.json(
        { error: 'Failed to delete page', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Page deleted successfully:', pageId);
    return NextResponse.json({ 
      success: true, 
      message: 'Page deleted successfully',
      deletedPage: existingPage
    });

  } catch (error: any) {
    console.error('❌ [API] Unexpected error deleting page:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 