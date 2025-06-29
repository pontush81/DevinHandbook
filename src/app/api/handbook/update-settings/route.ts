import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin, AUTH_RESPONSES } from '@/lib/standard-auth';
import { createDefaultForumCategories } from '@/lib/handbook-service';

export async function PATCH(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Update Settings] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Update Settings] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    console.log('✅ [Update Settings] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    // 2. Validera indata
    const { handbookId, forum_enabled } = await request.json();
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "Handbook ID krävs" },
        { status: 400 }
      );
    }

    if (typeof forum_enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, message: "forum_enabled måste vara en boolean" },
        { status: 400 }
      );
    }

    // 3. Kontrollera att användaren har admin-behörighet för handboken
    console.log('🔍 [Update Settings] Checking admin privileges for handbook:', handbookId);
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Update Settings] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    console.log('✅ [Update Settings] Admin privileges confirmed');

    // 4. If enabling forum, check if categories exist and create them if not
    const supabase = getServiceSupabase();
    
    if (forum_enabled) {
      console.log('🔍 [Update Settings] Checking for existing forum categories...');
      const { data: existingCategories } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('handbook_id', handbookId);

      if (!existingCategories || existingCategories.length === 0) {
        console.log('⚠️ [Update Settings] No categories found, creating default forum categories...');
        await createDefaultForumCategories(handbookId);
        console.log('✅ [Update Settings] Default forum categories created');
      } else {
        console.log('✅ [Update Settings] Forum categories already exist:', existingCategories.length);
      }
    }

    // 5. Uppdatera handbok-inställningar
    console.log('📝 [Update Settings] Updating handbook settings...');
    const { error: updateError } = await supabase
      .from("handbooks")
      .update({ 
        forum_enabled,
        updated_at: new Date().toISOString()
      })
      .eq("id", handbookId);

    if (updateError) {
      console.error("❌ [Update Settings] Error updating handbook:", updateError);
      return NextResponse.json(
        { success: false, message: "Kunde inte uppdatera handbok-inställningar" },
        { status: 500 }
      );
    }

    console.log('✅ [Update Settings] Handbook settings updated successfully');
    
    return NextResponse.json({
      success: true,
      message: forum_enabled 
        ? 'Forum aktiverat och kategorier skapade'
        : `Forum ${forum_enabled ? 'aktiverat' : 'inaktiverat'}`
    });
  } catch (error) {
    console.error("❌ [Update Settings] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 