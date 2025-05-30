import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const handbookId = params.id;
    console.log('🔄 [API] Fetching handbook data for ID:', handbookId);

    const supabase = getServiceSupabase();
    
    // Fetch handbook with sections and pages
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select(`
        *,
        sections (
          id,
          title,
          description,
          icon,
          order_index,
          is_public,
          is_published,
          pages (
            id,
            title,
            content,
            slug,
            order_index,
            is_published,
            created_at,
            updated_at
          )
        )
      `)
      .eq('id', handbookId)
      .single();

    if (handbookError) {
      console.error('❌ [API] Error fetching handbook:', handbookError);
      return NextResponse.json(
        { error: 'Failed to fetch handbook', details: handbookError.message },
        { status: 500 }
      );
    }

    if (!handbook) {
      return NextResponse.json(
        { error: 'Handbook not found' },
        { status: 404 }
      );
    }

    // Sort sections by order_index
    if (handbook.sections) {
      handbook.sections.sort((a, b) => a.order_index - b.order_index);
      
      // Sort pages within each section by order_index
      handbook.sections.forEach(section => {
        if (section.pages) {
          section.pages.sort((a, b) => a.order_index - b.order_index);
        }
      });
    }

    console.log('✅ [API] Handbook fetched successfully:', {
      id: handbook.id,
      title: handbook.title,
      sectionsCount: handbook.sections?.length || 0
    });

    return NextResponse.json(handbook);

  } catch (error) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 