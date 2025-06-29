import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth, isHandbookAdmin } from '@/lib/standard-auth';

// POST - Create/update a join code for a handbook
export async function POST(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Join Code POST] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Join Code POST] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    console.log('✅ [Join Code POST] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    // 2. Parse request data
    const { handbookId, expiresInDays = 30 } = await request.json();
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "handbook_id krävs" },
        { status: 400 }
      );
    }

    console.log('🔍 [Join Code POST] Checking admin privileges for handbook:', handbookId);
    
    // 3. Check admin privileges using standard helper
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Join Code POST] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    console.log('✅ [Join Code POST] Admin privileges confirmed');

    const supabase = getServiceSupabase();
    
    // Call the stored function to create join code
    console.log('📞 [Join Code POST] Creating join code...');
    const { data, error } = await supabase
      .rpc('create_handbook_join_code', {
        handbook_id: handbookId,
        user_id: authResult.userId,
        expires_in_days: expiresInDays
      });

    if (error) {
      console.error('❌ [Join Code POST] Error creating join code:', error);
      
      if (error.message.includes('Only handbook admins')) {
        return NextResponse.json(
          { success: false, message: "Du har inte admin-behörighet för denna handbok" },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: "Kunde inte skapa join-kod" },
        { status: 500 }
      );
    }

    console.log('✅ [Join Code POST] Join code created successfully');
    return NextResponse.json({
      success: true,
      joinCode: data,
      message: "Join-kod skapad"
    });

  } catch (error) {
    console.error('❌ [Join Code POST] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
}

// GET - Get current join code for a handbook
export async function GET(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Join Code GET] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Join Code GET] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    console.log('✅ [Join Code GET] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });
    
    // 2. Get handbook ID from query parameters
    const url = new URL(request.url);
    const handbookId = url.searchParams.get('handbookId');
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "handbookId krävs som query parameter" },
        { status: 400 }
      );
    }

    console.log('🔍 [Join Code GET] Checking admin privileges for handbook:', handbookId);

    // 3. Check admin privileges using standard helper
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Join Code GET] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: 'Du har inte admin-behörighet för denna handbok' },
        { status: 403 }
      );
    }

    console.log('✅ [Join Code GET] Admin privileges confirmed');

    // 4. Get current join code
    const supabase = getServiceSupabase();
    
    console.log('📋 [Join Code GET] Fetching join code...');
    const { data: handbook, error } = await supabase
      .from('handbooks')
      .select('join_code, join_code_expires_at, join_code_active')
      .eq('id', handbookId)
      .single();

    if (error) {
      console.error('❌ [Join Code GET] Error getting join code:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte hämta join-kod" },
        { status: 500 }
      );
    }

    console.log('✅ [Join Code GET] Join code retrieved successfully');
    return NextResponse.json({
      success: true,
      joinCode: handbook.join_code,
      expiresAt: handbook.join_code_expires_at,
      isActive: handbook.join_code_active
    });

  } catch (error) {
    console.error('❌ [Join Code GET] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate a join code
export async function DELETE(request: NextRequest) {
  try {
    // 1. Hämta och validera session med hybrid authentication
    console.log('🔐 [Join Code DELETE] Authenticating user with hybrid auth...');
    const authResult = await getHybridAuth(request);
    
    if (!authResult.userId) {
      console.log('❌ [Join Code DELETE] Authentication failed - no userId found');
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    console.log('✅ [Join Code DELETE] Successfully authenticated user:', {
      userId: authResult.userId,
      method: authResult.authMethod
    });

    // 2. Parse request data  
    const { handbookId } = await request.json();
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "handbook_id krävs" },
        { status: 400 }
      );
    }

    console.log('🔍 [Join Code DELETE] Checking admin privileges for handbook:', handbookId);

    // 3. Check admin privileges using standard helper
    const hasAdminAccess = await isHandbookAdmin(authResult.userId, handbookId);
    
    if (!hasAdminAccess) {
      console.log('❌ [Join Code DELETE] User lacks admin privileges');
      return NextResponse.json(
        { success: false, message: 'Du har inte admin-behörighet för denna handbok' },
        { status: 403 }
      );
    }

    console.log('✅ [Join Code DELETE] Admin privileges confirmed');

    // 4. Deactivate join code
    const supabase = getServiceSupabase();
    
    console.log('📝 [Join Code DELETE] Deactivating join code...');
    const { error } = await supabase
      .from('handbooks')
      .update({ 
        join_code_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', handbookId);

    if (error) {
      console.error('❌ [Join Code DELETE] Error deactivating join code:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte inaktivera join-kod" },
        { status: 500 }
      );
    }

    console.log('✅ [Join Code DELETE] Join code deactivated successfully');
    return NextResponse.json({
      success: true,
      message: "Join-kod inaktiverad"
    });

  } catch (error) {
    console.error('❌ [Join Code DELETE] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
} 