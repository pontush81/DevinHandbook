import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth-utils';
import { getServiceSupabase } from '@/lib/supabase';
import { createDefaultForumCategories } from '@/lib/handbook-service';
import { getHybridAuth, AUTH_RESPONSES } from '@/lib/standard-auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Robust authentication for handbook settings
    console.log('🔐 [Handbook Settings] Starting robust authentication...');
    
    let userId: string | null = null;
    
    // Method 1: Try hybrid auth first
    const authResult = await getHybridAuth(request);
    userId = authResult.userId;
    
    // Method 2: If hybrid auth failed, try direct Supabase client approach
    if (!userId) {
      console.log('🔍 [Handbook Settings] Trying direct Supabase auth...');
      
      try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value;
              },
            },
          }
        );

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!error && user) {
          console.log('✅ [Handbook Settings] Direct auth successful:', user.id);
          userId = user.id;
        }
      } catch (directAuthError) {
        console.log('⚠️ [Handbook Settings] Direct auth error:', directAuthError);
      }
    }
    
    // Method 3: Try Authorization header
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        console.log('🔍 [Handbook Settings] Trying Bearer token auth...');
        
        try {
          const token = authHeader.substring(7);
          const cookieStore = await cookies();
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                get(name: string) {
                  return cookieStore.get(name)?.value;
                },
              },
            }
          );
          
          const { data: { user }, error } = await supabase.auth.getUser(token);
          
          if (!error && user) {
            console.log('✅ [Handbook Settings] Bearer token auth successful:', user.id);
            userId = user.id;
          }
        } catch (tokenError) {
          console.log('⚠️ [Handbook Settings] Bearer token auth failed:', tokenError);
        }
      }
    }
    
    if (!userId) {
      console.log('❌ [Handbook Settings] All authentication methods failed');
      return NextResponse.json(
        { error: 'Ej autentiserad' },
        { status: 401 }
      );
    }

    console.log('✅ [Handbook Settings] Authentication successful for user:', userId);
    
    const body = await request.json();
    const { forum_enabled } = body;

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