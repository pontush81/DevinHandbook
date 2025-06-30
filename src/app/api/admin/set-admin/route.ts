import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireSecureContext, rateLimit, logSecurityEvent, adminAuth } from '@/lib/security-utils';

export async function POST(req: NextRequest) {
  try {
    // 1. Säkerhetskontroller
    const securityContextCheck = requireSecureContext(req);
    if (securityContextCheck) {
      return securityContextCheck;
    }

    const rateLimitCheck = rateLimit(req, 5, 300000); // Max 5 requests per 5 minuter
    if (rateLimitCheck) {
      return rateLimitCheck;
    }

    // 2. Standardiserad admin-autentisering
    const authResult = await adminAuth(req);
    if (!authResult.success) {
      logSecurityEvent('unauthorized-admin-access-attempt', {
        endpoint: 'set-admin',
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });
      return authResult.response!;
    }

    // 3. Validera indata
    const { userId, isAdmin } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Förhindra att superadmin tar bort sin egen admin-status
    if (userId === authResult.userId && isAdmin === false) {
      logSecurityEvent('superadmin-self-demotion-attempt', {
        adminId: authResult.userId,
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json(
        { error: 'Du kan inte ta bort din egen superadmin-status' },
        { status: 400 }
      );
    }
    
    // 4. Uppdatera is_superadmin i profiles-tabellen
    const adminStatus = isAdmin !== false;
    const supabase = getServiceSupabase();
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_superadmin: adminStatus })
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error updating admin status:', profileError);
      return NextResponse.json(
        { error: 'Failed to update user admin status' },
        { status: 500 }
      );
    }

    // 5. Logga säkerhetsändring
    logSecurityEvent('admin-status-changed', {
      changedBy: authResult.userId,
      targetUser: userId,
      newStatus: adminStatus ? 'superadmin' : 'regular_user',
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({ 
      success: true,
      message: adminStatus ? 'User set as superadmin' : 'Superadmin status removed'
    });
  } catch (error: unknown) {
    console.error('Error updating user admin status:', error);
    logSecurityEvent('admin-endpoint-error', {
      endpoint: 'set-admin',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    });
    return NextResponse.json(
      { error: 'Failed to update user admin status' },
      { status: 500 }
    );
  }
}
