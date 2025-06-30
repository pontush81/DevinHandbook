import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/security-utils';

export async function GET(request: NextRequest) {
  try {
    // Använd ny standardiserad admin-autentisering
    const authResult = await adminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { isSuperAdmin: false, error: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // Om vi kom hit så är användaren redan verifierad som superadmin
    return NextResponse.json({
      isSuperAdmin: true,
      userId: authResult.userId,
      email: authResult.userEmail
    });
    
  } catch (error) {
    console.error('❌ [CheckSuperAdmin] Error checking superadmin status:', error);
    return NextResponse.json(
      { isSuperAdmin: false, error: "Fel vid kontroll av admin-status" },
      { status: 500 }
    );
  }
} 