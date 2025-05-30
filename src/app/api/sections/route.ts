import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const sectionData = await request.json();

    console.log('🔄 [API] Creating new section:', sectionData);

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('sections')
      .insert(sectionData)
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Error creating section:', error);
      return NextResponse.json(
        { error: 'Failed to create section', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Section created successfully:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 