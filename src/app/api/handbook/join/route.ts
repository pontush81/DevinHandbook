import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

// POST - Join a handbook using a join code
export async function POST(request: NextRequest) {
  try {
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
      const session = await getServerSession();
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: "Du måste vara inloggad för att gå med i en handbok" },
          { status: 401 }
        );
      }
      currentUserId = session.user.id;
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
        user_id: currentUserId,
        user_role: role
      });

    if (error) {
      console.error('Error joining handbook with code:', error);
      
      // Handle specific errors better
      if (error.message && error.message.includes('already a member')) {
        return NextResponse.json(
          { success: false, message: "Du är redan medlem i denna handbok" },
          { status: 400 }
        );
      }
      
      // Handle duplicate notification preferences 
      if (error.code === '23505' && error.message.includes('user_notification_preferences')) {
        // User is already a member, just return success with the handbook info
        console.log('[Join API] User already has notification preferences, checking if member...');
        
        // Get handbook info for response
        const { data: handbook, error: handbookError } = await supabase
          .from('handbooks')
          .select('id, title, slug')
          .eq('join_code', joinCode.trim().toUpperCase())
          .eq('join_code_active', true)
          .single();
        
        if (!handbookError && handbook) {
          return NextResponse.json({
            success: true,
            handbook: {
              id: handbook.id,
              title: handbook.title,
              slug: handbook.slug
            },
            message: "Du är redan medlem i denna handbok"
          });
        }
      }
      
      return NextResponse.json(
        { success: false, message: "Kunde inte gå med i handboken" },
        { status: 500 }
      );
    }

    // The function returns JSON with success status
    if (!data.success) {
      return NextResponse.json(
        { success: false, message: data.error || "Ogiltig eller utgången join-kod" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Du har gått med i handboken "${data.handbook_title}"`,
      handbook: {
        id: data.handbook_id,
        title: data.handbook_title,
        slug: data.handbook_slug
      }
    });

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