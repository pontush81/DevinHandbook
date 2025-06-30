import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsSuperAdmin } from '@/lib/user-utils';
import { getHybridAuth } from '@/lib/standard-auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    // 1. Autentisera användaren
    const authResult = await getHybridAuth(request);
    if (!authResult.userId) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Kontrollera superadmin-behörighet
    const supabase = getServiceSupabase();
    const isSuperAdmin = await checkIsSuperAdmin(
      supabase,
      authResult.userId,
      authResult.userEmail || ''
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Du har inte superadmin-behörighet för att radera handböcker" },
        { status: 403 }
      );
    }

    // 3. Validera indata
    const { handbookId } = await request.json();
    
    if (!handbookId) {
      return NextResponse.json({ error: 'Handbook ID is required' }, { status: 400 });
    }

    console.log('🗑️ Superadmin', authResult.userId, 'starting deletion of handbook:', handbookId);

    // Create Supabase client with service role for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all related data in correct order due to foreign key constraints
    
    // 1. Get all section IDs for this handbook first
    const { data: sections, error: sectionsQueryError } = await supabaseAdmin
      .from('sections')
      .select('id')
      .eq('handbook_id', handbookId);

    if (sectionsQueryError) {
      console.error('Error querying sections:', sectionsQueryError);
      return NextResponse.json({ error: 'Failed to query sections' }, { status: 500 });
    }

    const sectionIds = sections.map(s => s.id);
    console.log('📄 Found sections to delete:', sectionIds.length);

    // 2. Delete pages first (they reference sections)
    if (sectionIds.length > 0) {
      const { error: pagesError } = await supabaseAdmin
        .from('pages')
        .delete()
        .in('section_id', sectionIds);

      if (pagesError) {
        console.error('Error deleting pages:', pagesError);
        return NextResponse.json({ error: 'Failed to delete pages' }, { status: 500 });
      }
      console.log('✅ Deleted pages for sections');
    }

    // 3. Delete sections (they reference handbooks)
    const { error: sectionsError } = await supabaseAdmin
      .from('sections')
      .delete()
      .eq('handbook_id', handbookId);

    if (sectionsError) {
      console.error('Error deleting sections:', sectionsError);
      return NextResponse.json({ error: 'Failed to delete sections' }, { status: 500 });
    }
    console.log('✅ Deleted sections');

    // 4. Delete handbook members
    const { error: membersError } = await supabaseAdmin
      .from('handbook_members')
      .delete()
      .eq('handbook_id', handbookId);

    if (membersError) {
      console.error('Error deleting handbook members:', membersError);
      return NextResponse.json({ error: 'Failed to delete handbook members' }, { status: 500 });
    }
    console.log('✅ Deleted handbook members');

    // 5. Delete trial activities if any
    const { error: trialError } = await supabaseAdmin
      .from('trial_activities')
      .delete()
      .eq('handbook_id', handbookId);

    if (trialError) {
      console.error('Error deleting trial activities:', trialError);
      // Don't fail the whole operation for this
    } else {
      console.log('✅ Deleted trial activities');
    }

    // 6. Finally delete the handbook itself
    const { error: handbookError } = await supabaseAdmin
      .from('handbooks')
      .delete()
      .eq('id', handbookId);

    if (handbookError) {
      console.error('Error deleting handbook:', handbookError);
      return NextResponse.json({ error: 'Failed to delete handbook' }, { status: 500 });
    }

    console.log('✅ Superadmin', authResult.userId, 'successfully deleted handbook:', handbookId);

    return NextResponse.json({ 
      success: true, 
      message: 'Handbook and all related data deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error in delete-handbook API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 