import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth-utils';
import { getServiceSupabase } from '@/lib/supabase';
import { createDefaultForumCategories } from '@/lib/handbook-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { forum_enabled, userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId är obligatorisk' },
        { status: 400 }
      );
    }

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