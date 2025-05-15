import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { app_metadata: { roles: ['admin'] } }
    );
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error setting user as admin:', error);
    return NextResponse.json(
      { error: 'Failed to set user as admin' },
      { status: 500 }
    );
  }
}
