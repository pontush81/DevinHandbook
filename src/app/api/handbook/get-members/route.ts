import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAdminClient } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin } from '@/lib/standard-auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Get Members] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Get Members] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    console.log('✅ [Get Members] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });
    
    // 2. Validera handboks-ID från query parameters
    const { searchParams } = new URL(request.url);
    const handbookId = searchParams.get('handbookId');
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "Handbook ID krävs" },
        { status: 400 }
      );
    }

    console.log('🔍 [Get Members] Checking admin privileges for handbook:', handbookId);

    // 3. Kontrollera att användaren har admin-behörighet för handboken
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Get Members] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    console.log('✅ [Get Members] Admin privileges confirmed');

    // 4. Hämta medlemmar först  
    // Use admin client for auth operations and service client for database operations
    const adminClient = getAdminClient();
    const supabase = getServiceSupabase();
    
    console.log('📋 [Get Members] Fetching members for handbook...');
    const { data: members, error: membersError } = await supabase
      .from('handbook_members')
      .select('id, user_id, role, created_at')
      .eq('handbook_id', handbookId);

    if (membersError) {
      console.error("❌ [Get Members] Error fetching members:", membersError);
      return NextResponse.json(
        { success: false, message: "Kunde inte hämta medlemmar" },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      console.log(`⚠️ [Get Members] No members found for handbook ${handbookId}`);
      return NextResponse.json({
        success: true,
        members: []
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    console.log(`📋 [Get Members] Found ${members.length} members, fetching user details...`);

    // 5. Hämta användardata för alla medlemmar
    const membersWithEmails = [];
    
    for (const member of members) {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(member.user_id);
        
        const email = userData?.user?.email || "Okänd e-post";
        
        membersWithEmails.push({
          id: member.id,
          user_id: member.user_id,
          email: email,
          role: member.role,
          created_at: member.created_at,
        });
        
        console.log(`✅ [Get Members] Member ${member.user_id}: ${email} (${member.role})`);
      } catch (userError) {
        console.error(`⚠️ [Get Members] Could not fetch user data for ${member.user_id}:`, userError);
        // Lägg till medlemmen ändå, bara utan e-post
        membersWithEmails.push({
          id: member.id,
          user_id: member.user_id,
          email: "Okänd e-post",
          role: member.role,
          created_at: member.created_at,
        });
      }
    }

    console.log(`✅ [Get Members] Returning ${membersWithEmails.length} members for handbook ${handbookId}`);

    return NextResponse.json({
      success: true,
      members: membersWithEmails
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("❌ [Get Members] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 