import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, isAdmin } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    // Uppdatera is_superadmin i profiles-tabellen
    // isAdmin är true för att ge admin-status, false för att ta bort den
    const adminStatus = isAdmin !== false; // default till true om inte explicit false
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_superadmin: adminStatus })
      .eq('id', userId);
    
    if (profileError) {
      throw profileError;
    }
    
    return NextResponse.json({ 
      success: true,
      message: adminStatus ? 'User set as superadmin' : 'Superadmin status removed'
    });
  } catch (error: unknown) {
    console.error('Error updating user admin status:', error);
    return NextResponse.json(
      { error: 'Failed to update user admin status' },
      { status: 500 }
    );
  }
}
