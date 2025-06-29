import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin } from '@/lib/standard-auth';

export async function PATCH(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Update Member Role] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Update Member Role] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    console.log('✅ [Update Member Role] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    // 2. Parse request data
    const { handbookId, memberId, role } = await request.json();

    if (!handbookId || !memberId || !role) {
      return NextResponse.json(
        { success: false, message: "handbookId, memberId och role krävs" },
        { status: 400 }
      );
    }

    console.log('🔍 [Update Member Role] Checking admin privileges for handbook:', handbookId);

    const supabase = getServiceSupabase();

    // Kontrollera att användaren är admin för handboken
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Update Member Role] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    console.log('✅ [Update Member Role] Admin privileges confirmed');

    // Uppdatera medlemmens roll
    console.log('📝 [Update Member Role] Updating member role to:', role);
    const { error } = await supabase
      .from('handbook_members')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('handbook_id', handbookId);

    if (error) {
      console.error('❌ [Update Member Role] Error updating member role:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte uppdatera medlemsroll" },
        { status: 500 }
      );
    }

    console.log('✅ [Update Member Role] Member role updated successfully');
    return NextResponse.json({
      success: true,
      message: "Medlemsroll uppdaterad"
    });

  } catch (error) {
    console.error('❌ [Update Member Role] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
} 