import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSessionFromRequestOrCookies } from '@/lib/auth-utils';

// POST - Join a handbook using a join code
export async function POST(request: NextRequest) {
  try {
    // 🔍 ENHANCED DEBUGGING FOR JOIN PROCESS
    console.log('🚀 [Join API] === JOIN REQUEST STARTED ===');
    console.log('🔍 [Join API] Timestamp:', new Date().toISOString());
    console.log('🔍 [Join API] Request URL:', request.url);
    console.log('🔍 [Join API] Headers present:', {
      contentType: request.headers.get('content-type'),
      authorization: !!request.headers.get('authorization'),
      cookie: !!request.headers.get('cookie'),
      userAgent: request.headers.get('user-agent')?.slice(0, 50) + '...'
    });
    
    const body = await request.json();
    console.log('📋 [Join API] Request body:', body);
    
    const { joinCode, role = 'viewer', userId } = body;
    
    // Development mode: Allow direct userId parameter
    const isDevelopment = process.env.NODE_ENV === 'development';
    let currentUserId: string;
    
    if (isDevelopment && userId) {
      console.log('🔧 [Join API] Development mode: Using provided userId:', userId);
      currentUserId = userId;
    } else {
      console.log('🔐 [Join API] Production mode: Getting user from session...');
      
      // Normal mode: Get user from session with enhanced error handling
      let session;
      
      try {
        session = await getSessionFromRequestOrCookies(request);
        console.log('📋 [Join API] Session result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id || 'none',
          authMethod: session?.token_type || 'unknown'
        });
      } catch (authError) {
        console.error('💥 [Join API] Authentication error:', authError);
        
        // Check if it's a specific Bearer token error
        if (authError.message?.includes('missing sub claim') || 
            authError.message?.includes('bad_jwt') ||
            authError.message?.includes('invalid claim')) {
          console.log('🔄 [Join API] Bearer token corrupted, attempting cookie fallback...');
          
          // Try cookie-only authentication as fallback
          try {
            const { getServerSession } = require('@/lib/auth-utils');
            session = await getServerSession();
            console.log('📋 [Join API] Cookie fallback result:', {
              hasSession: !!session,
              hasUser: !!session?.user,
              userId: session?.user?.id || 'none'
            });
          } catch (cookieError) {
            console.error('💥 [Join API] Cookie fallback also failed:', cookieError);
            session = null;
          }
        } else {
          session = null;
        }
      }
      
      if (!session?.user) {
        console.log('❌ [Join API] No valid session found after all attempts');
        return NextResponse.json(
          { 
            success: false, 
            message: "Du måste vara inloggad för att gå med i en handbok",
            debug: {
              authenticationFailed: true,
              suggestions: [
                "Försök logga ut och logga in igen",
                "Rensa cookies och localStorage",
                "Kontakta support om problemet kvarstår"
              ]
            }
          },
          { status: 401 }
        );
      }
      
      currentUserId = session.user.id;
      console.log('✅ [Join API] Successfully authenticated user:', currentUserId);
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
    
    // Call the stored function to join handbook
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