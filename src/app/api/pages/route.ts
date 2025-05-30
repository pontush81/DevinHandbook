import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const pageData = await request.json();

    console.log('🔄 [API] Creating new page:', pageData);

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('pages')
      .insert(pageData)
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Error creating page:', error);
      return NextResponse.json(
        { error: 'Failed to create page', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Page created successfully:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ [API] Unexpected error creating page:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 