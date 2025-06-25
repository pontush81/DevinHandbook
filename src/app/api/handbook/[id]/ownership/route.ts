import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id: handbookId } = await params;

    if (!userId || !handbookId) {
      return NextResponse.json(
        { error: 'Missing userId or handbookId' },
        { status: 400 }
      );
    }

    // Check if user owns this handbook
    const { data: handbookData, error } = await supabase
      .from('handbooks')
      .select('owner_id')
      .eq('id', handbookId)
      .single();

    if (error) {
      console.error('Error checking handbook ownership:', error);
      return NextResponse.json(
        { error: 'Failed to check ownership' },
        { status: 500 }
      );
    }

    const isOwner = handbookData.owner_id === userId;

    return NextResponse.json({
      isOwner,
      handbookId,
      userId,
      ownerId: handbookData.owner_id
    });

  } catch (error) {
    console.error('Unexpected error in ownership check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 