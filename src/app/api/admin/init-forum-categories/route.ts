import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { getServiceSupabase } from '@/lib/supabase';
import { createDefaultForumCategories } from '@/lib/handbook-service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { handbook_id } = body;

    if (!handbook_id) {
      return NextResponse.json(
        { error: 'handbook_id är obligatorisk' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify user is admin of this handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('role')
      .eq('handbook_id', handbook_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData || memberData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Du har inte behörighet att hantera denna handbok' },
        { status: 403 }
      );
    }

    // Check if categories already exist
    const { data: existingCategories } = await supabase
      .from('forum_categories')
      .select('id')
      .eq('handbook_id', handbook_id);

    if (existingCategories && existingCategories.length > 0) {
      return NextResponse.json(
        { 
          message: 'Forum-kategorier finns redan för denna handbok',
          categories_count: existingCategories.length
        },
        { status: 200 }
      );
    }

    // Create default categories
    await createDefaultForumCategories(handbook_id);

    // Get the created categories to return
    const { data: newCategories } = await supabase
      .from('forum_categories')
      .select('id, name, description')
      .eq('handbook_id', handbook_id)
      .order('order_index');

    return NextResponse.json({
      success: true,
      message: 'Default forum-kategorier skapade',
      categories: newCategories
    });

  } catch (error) {
    console.error('Error creating default forum categories:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 