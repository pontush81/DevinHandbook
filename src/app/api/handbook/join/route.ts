import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

// POST - Join a handbook using a join code
export async function POST(request: NextRequest) {
  try {
    // Add comprehensive debugging for production
    console.log('🔍 [Join API] === AUTHENTICATION DEBUGGING ===');
    console.log('🔍 [Join API] NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 [Join API] Request URL:', request.url);
    console.log('🔍 [Join API] Request headers cookies:', request.headers.get('cookie'));
    
    const { joinCode, role = 'viewer', userId } = await request.json();
    
    // Development mode: Allow direct userId parameter
    const isDevelopment = process.env.NODE_ENV === 'development';
    let currentUserId: string;
    
    if (isDevelopment && userId) {
      // Development mode: Use provided userId (from confirm-user API)
      currentUserId = userId;
      console.log('[Join API] Development mode: Using provided userId:', currentUserId);
    } else {
      // Normal mode: Get user from session
      console.log('🔍 [Join API] Getting server session...');
      const session = await getServerSession();
      console.log('🔍 [Join API] Server session result:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });
      
      if (!session?.user) {
        console.log('❌ [Join API] No session found, returning 401');
        return NextResponse.json(
          { success: false, message: "Du måste vara inloggad för att gå med i en handbok" },
          { status: 401 }
        );
      }
      currentUserId = session.user.id;
      console.log('✅ [Join API] Using session userId:', currentUserId);
    }
    
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

    const supabase = getServiceSupabase();
    
    console.log('[Join API] About to call join_handbook_with_code with:', {
      join_code: joinCode.trim().toUpperCase(),
      p_user_id: currentUserId,
      user_role: role
    });
    
    // Call the stored function to join handbook
    const { data, error } = await supabase
      .rpc('join_handbook_with_code', {
        join_code: joinCode.trim().toUpperCase(),
        p_user_id: currentUserId,
        user_role: role
      });

    console.log('[Join API] join_handbook_with_code result:', { data, error });

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

    console.log('[Join API] Returning successful response:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in POST /api/handbook/join:', error);
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