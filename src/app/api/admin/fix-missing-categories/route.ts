import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { getServiceSupabase } from '@/lib/supabase';
import { createDefaultForumCategories } from '@/lib/handbook-service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only authenticated users
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad' },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabase();

    // Get all handbooks where forum is enabled but no categories exist
    // Only include handbooks where user is admin
    const { data: handbooksNeedingFix, error: handbooksError } = await supabase
      .from('handbooks')
      .select(`
        id, 
        title,
        handbook_members!inner(user_id, role)
      `)
      .eq('forum_enabled', true)
      .eq('handbook_members.user_id', session.user.id)
      .eq('handbook_members.role', 'admin');

    if (handbooksError) {
      console.error('Error fetching handbooks:', handbooksError);
      return NextResponse.json(
        { error: 'Kunde inte hämta handböcker' },
        { status: 500 }
      );
    }

    if (!handbooksNeedingFix || handbooksNeedingFix.length === 0) {
      return NextResponse.json({
        message: 'Inga handböcker som behöver kategorier hittades',
        fixed: []
      });
    }

    const results = [];

    for (const handbook of handbooksNeedingFix) {
      // Check if categories already exist
      const { data: existingCategories } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('handbook_id', handbook.id);

      if (!existingCategories || existingCategories.length === 0) {
        try {
          console.log('Creating categories for handbook:', handbook.title);
          await createDefaultForumCategories(handbook.id);
          
          // Verify categories were created
          const { data: newCategories } = await supabase
            .from('forum_categories')
            .select('id, name')
            .eq('handbook_id', handbook.id);

          results.push({
            handbook_id: handbook.id,
            handbook_title: handbook.title,
            success: true,
            categories_created: newCategories?.length || 0,
            categories: newCategories
          });
        } catch (error) {
          console.error('Error creating categories for handbook:', handbook.id, error);
          results.push({
            handbook_id: handbook.id,
            handbook_title: handbook.title,
            success: false,
            error: 'Kunde inte skapa kategorier'
          });
        }
      } else {
        results.push({
          handbook_id: handbook.id,
          handbook_title: handbook.title,
          success: true,
          message: 'Kategorier finns redan',
          existing_categories: existingCategories.length
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Kontrollerade ${results.length} handböcker`,
      results: results
    });

  } catch (error) {
    console.error('Error fixing missing categories:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 