import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const supabase = getAdminClient();

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get handbooks the user has access to using proper join syntax
    const { data: handbookData, error: handbooksError } = await supabase
      .from('handbook_members')
      .select(`
        handbooks!inner (
          id,
          title,
          slug,
          created_at,
          published,
          owner_id
        )
      `)
      .eq('user_id', user.id);

    if (handbooksError) {
      console.error('❌ Error fetching user handbooks:', handbooksError);
      return NextResponse.json(
        { error: 'Failed to fetch handbooks' },
        { status: 500 }
      );
    }

    // Extract handbooks from the join result
    const userHandbooks = handbookData
      ?.map(item => item.handbooks)
      .filter(Boolean) || [];

    return NextResponse.json(userHandbooks);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 