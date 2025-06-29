import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth-utils';
import { getServiceSupabase } from '@/lib/supabase';
import { createDefaultForumCategories } from '@/lib/handbook-service';
import { getHybridAuth, AUTH_RESPONSES } from '@/lib/standard-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication first
    console.log('🔐 [Handbook Settings] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Handbook Settings] Authentication failed - no userId found');
      return NextResponse.json(
        AUTH_RESPONSES.UNAUTHENTICATED,
        { status: AUTH_RESPONSES.UNAUTHENTICATED.status }
      );
    }

    console.log('✅ [Handbook Settings] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });
    
    const body = await request.json();
    const { forum_enabled } = body;
    const userId = authResult.userId; // Use authenticated userId

    // Check if user is admin of this handbook
    const userRole = await getUserRole(userId, id);
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Du måste vara admin för att ändra handboksinställningar' },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabase();

    // If enabling forum, check if categories exist and create them if not
    if (forum_enabled) {
      const { data: existingCategories } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('handbook_id', id);

      if (!existingCategories || existingCategories.length === 0) {
        console.log('Creating default forum categories for handbook:', id);
        await createDefaultForumCategories(id);
      }
    }

    // Update handbook settings
    const { data: updatedHandbook, error: updateError } = await supabase
      .from('handbooks')
      .update({
        forum_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating handbook settings:', updateError);
      return NextResponse.json(
        { error: 'Kunde inte uppdatera handboksinställningar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      handbook: updatedHandbook,
      message: forum_enabled 
        ? 'Forum aktiverat och kategorier skapade'
        : 'Forum inaktiverat'
    });

  } catch (error) {
    console.error('Error in handbook settings API:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 