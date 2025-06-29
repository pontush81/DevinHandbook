import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin } from '@/lib/standard-auth';

export async function DELETE(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Remove Member] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Remove Member] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    console.log('✅ [Remove Member] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    // 2. Parse request data
    const { handbookId, memberId } = await request.json();

    if (!handbookId || !memberId) {
      return NextResponse.json(
        { success: false, message: "handbookId och memberId krävs" },
        { status: 400 }
      );
    }

    console.log('🔍 [Remove Member] Checking admin privileges for handbook:', handbookId);

    const supabase = getServiceSupabase();

    // Kontrollera att användaren är admin för handboken
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Remove Member] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    console.log('✅ [Remove Member] Admin privileges confirmed');

    // Kontrollera att medlemmen finns och tillhör handboken
    console.log('🔍 [Remove Member] Verifying member exists...');
    const { data: member, error: memberError } = await supabase
      .from('handbook_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('handbook_id', handbookId)
      .single();

    if (memberError) {
      console.error('❌ [Remove Member] Error finding member:', memberError);
      return NextResponse.json(
        { success: false, message: "Medlem hittades inte" },
        { status: 404 }
      );
    }

    // Förhindra att användaren tar bort sig själv
    if (member.user_id === authResult.userId) {
      console.log('⚠️ [Remove Member] User tried to remove themselves');
      return NextResponse.json(
        { success: false, message: "Du kan inte ta bort dig själv från handboken" },
        { status: 400 }
      );
    }

    // Ta bort medlemmen
    console.log('🗑️ [Remove Member] Removing member from handbook...');
    const { error } = await supabase
      .from('handbook_members')
      .delete()
      .eq('id', memberId)
      .eq('handbook_id', handbookId);

    if (error) {
      console.error('❌ [Remove Member] Error removing member:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte ta bort medlem" },
        { status: 500 }
      );
    }

    console.log('✅ [Remove Member] Member removed successfully');
    return NextResponse.json({
      success: true,
      message: "Medlem borttagen"
    });

  } catch (error) {
    console.error('❌ [Remove Member] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
} 