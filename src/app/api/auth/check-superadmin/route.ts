import { NextRequest, NextResponse } from 'next/server';
import { getHybridAuth } from '@/lib/standard-auth';
import { checkIsSuperAdmin } from '@/lib/user-utils';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 1. Autentisera användaren
    const authResult = await getHybridAuth(request);
    if (!authResult.userId) {
      return NextResponse.json(
        { isSuperAdmin: false, error: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Kontrollera superadmin-behörighet
    const supabase = getServiceSupabase();
    const isSuperAdmin = await checkIsSuperAdmin(
      supabase,
      authResult.userId,
      authResult.userEmail || ''
    );

    return NextResponse.json({
      isSuperAdmin,
      userId: authResult.userId,
      email: authResult.userEmail
    });
    
  } catch (error) {
    console.error('Error checking superadmin status:', error);
    return NextResponse.json(
      { isSuperAdmin: false, error: "Fel vid kontroll av admin-status" },
      { status: 500 }
    );
  }
} 