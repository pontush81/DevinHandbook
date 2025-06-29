import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getHybridAuth, AUTH_RESPONSES } from '@/lib/standard-auth';

/**
 * API-rutt för att kontrollera om inloggad användare är admin för en specifik handbok
 */
export async function GET(req: NextRequest) {
  try {
    // Hämta handbok_id från query-parametrar
    const { searchParams } = new URL(req.url);
    const handbookId = searchParams.get('handbook_id') || searchParams.get('handbookId');

    if (!handbookId) {
      return NextResponse.json(
        { error: "handbok_id parameter krävs" },
        { status: 400 }
      );
    }
    
    console.log('🔐 [Check Admin Status] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(req);
    
    if (!authResult.userId) {
      console.log('❌ [Check Admin Status] Authentication failed - no userId found');
      return NextResponse.json(
        { error: "Användaren är inte inloggad", isAdmin: false },
        { status: 401 }
      );
    }
    
    console.log('✅ [Check Admin Status] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });
    
    const userId = authResult.userId;
    
    // Använd admin-klienten för att kringgå RLS-begränsningar
    const adminClient = getAdminClient();
    
    // Kontrollera medlemskap i handbok_members
    const { data, error } = await adminClient
      .from('handbook_members')
      .select('role')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[check-admin-status] Databasfel:', error);
      return NextResponse.json(
        { error: "Fel vid kontroll av adminstatus", isAdmin: false },
        { status: 500 }
      );
    }
    
    const isAdmin = data && data.role === 'admin';
    
    return NextResponse.json({
      isAdmin,
      userId,
      handbookId
    });
    
  } catch (error) {
    console.error('[check-admin-status] Oväntat fel:', error);
    return NextResponse.json(
      { error: "Ett oväntat fel inträffade", isAdmin: false },
      { status: 500 }
    );
  }
}

// För att undvika CORS-problem vid lokalt testande
export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    } 
  });
} 