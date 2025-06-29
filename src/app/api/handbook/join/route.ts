import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAdminClient } from '@/lib/supabase';
import { getHybridAuth } from '@/lib/standard-auth';

// POST - Join a handbook using a join code
export async function POST(request: NextRequest) {
  try {
    // 🔍 ENHANCED DEBUGGING FOR JOIN PROCESS
    console.log('🚀 [Join API] === JOIN REQUEST STARTED ===');
    console.log('🔍 [Join API] Timestamp:', new Date().toISOString());
    console.log('🔍 [Join API] Request URL:', request.url);
    
    const body = await request.json();
    console.log('📋 [Join API] Request body:', body);
    
    const { joinCode, role = 'viewer' } = body;
    
    // Use standardized hybrid authentication
    console.log('🔐 [Join API] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Join API] Authentication failed - no userId found');
      return NextResponse.json(
        { 
          success: false, 
          message: "Du måste vara inloggad för att gå med i en handbok",
        },
        { status: 401 }
      );
    }
    
    const currentUserId = authResult.userId;
    console.log('✅ [Join API] Successfully authenticated user:', {
      userId: currentUserId,
      method: authResult.authMethod
    });
    
    if (!joinCode) {
      return NextResponse.json(
        { success: false, message: "Join-kod krävs" },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Ogiltig roll" },
        { status: 400 }
      );
    }

    // Use admin client for auth operations and service client for database operations
    const adminClient = getAdminClient();
    const supabase = getServiceSupabase();
    
    // 🔧 NEW: Ensure user profile exists before attempting join
    // This fixes the Google OAuth issue where profiles aren't created automatically
    console.log('🔧 [Join API] Ensuring user profile exists for:', currentUserId);
    
    try {
      // First check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUserId)
        .maybeSingle();
      
      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('💥 [Join API] Error checking profile:', profileCheckError);
      }
      
      if (!existingProfile) {
        console.log('⚠️ [Join API] Profile missing for user, creating one...');
        
        // Get user email from auth for profile creation
        const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(currentUserId);
        const userEmail = authUser?.user?.email || 'unknown@example.com';
        
        if (authError) {
          console.error('💥 [Join API] Could not get user email from auth:', authError);
        }
        
        // Create profile with admin client to bypass RLS
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: currentUserId,
            email: userEmail,
            created_at: new Date().toISOString(),
            is_superadmin: false
          });
        
        if (createProfileError) {
          console.error('💥 [Join API] Could not create profile:', createProfileError);
          
          // Continue anyway - the join function might handle this
          console.log('⚠️ [Join API] Continuing with join despite profile creation failure...');
        } else {
          console.log('✅ [Join API] Profile created successfully for user:', currentUserId);
        }
      } else {
        console.log('✅ [Join API] Profile already exists for user:', currentUserId);
      }
    } catch (profileError) {
      console.error('💥 [Join API] Error in profile creation logic:', profileError);
      // Continue anyway
    }
    
    // Call the stored function to join handbook
    console.log('📞 [Join API] Calling join_handbook_with_code function...');
    const { data, error } = await supabase
      .rpc('join_handbook_with_code', {
        join_code: joinCode.trim().toUpperCase(),
        p_user_id: currentUserId,
        user_role: role
      });

    if (error) {
      console.error('Error joining handbook with code:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte gå med i handboken" },
        { status: 500 }
      );
    }

    // Handle the improved response format from the stored function
    if (!data || !data.success) {
      const errorMessage = data?.error || "Ogiltig eller utgången join-kod";
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 400 }
      );
    }

    // Determine appropriate message based on whether user was already a member
    const message = data.already_member 
      ? `Du är redan medlem i "${data.handbook_title}"`
      : `Välkommen till "${data.handbook_title}"!`;

    const responseData: any = {
      success: true,
      message: data.message || message,
      handbook: {
        id: data.handbook_id,
        title: data.handbook_title,
        slug: data.handbook_slug
      }
    };

    // Add additional info for existing members
    if (data.already_member) {
      responseData.already_member = true;
      responseData.current_role = data.current_role;
    } else {
      responseData.role = data.role;
    }

    console.log('✅ [Join API] === JOIN REQUEST COMPLETED SUCCESSFULLY ===');
    console.log('🎉 [Join API] User successfully joined handbook:', responseData.handbook.title);
    console.log('👤 [Join API] User ID:', currentUserId);
    console.log('📝 [Join API] Response data:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.log('❌ [Join API] === JOIN REQUEST FAILED ===');
    console.error('💥 [Join API] Error details:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
}

// GET - Verify a join code (without joining)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const joinCode = url.searchParams.get('code');
    
    if (!joinCode) {
      return NextResponse.json(
        { success: false, message: "Join-kod krävs som query parameter" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    
    // Find handbook with valid join code (uses RLS policy for public access)
    const { data: handbook, error } = await supabase
      .from('handbooks')
      .select('id, title, slug, join_code_expires_at')
      .eq('join_code', joinCode.trim().toUpperCase())
      .eq('join_code_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error verifying join code:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte verifiera join-kod" },
        { status: 500 }
      );
    }

    if (!handbook) {
      return NextResponse.json(
        { success: false, message: "Ogiltig eller inaktiv join-kod" },
        { status: 404 }
      );
    }

    // Check if code has expired
    if (handbook.join_code_expires_at && new Date(handbook.join_code_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, message: "Join-koden har gått ut" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      handbook: {
        id: handbook.id,
        title: handbook.title,
        slug: handbook.slug,
        expiresAt: handbook.join_code_expires_at
      }
    });

  } catch (error) {
    console.error('Error in GET /api/handbook/join:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
} 