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
    
    // Uppdatera is_superadmin i profiles-tabellen
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_superadmin: true })
      .eq('id', userId);
    
    if (profileError) {
      throw profileError;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error setting user as superadmin:', error);
    return NextResponse.json(
      { error: 'Failed to set user as superadmin' },
      { status: 500 }
    );
  }
}
