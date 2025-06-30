import { NextRequest, NextResponse } from 'next/server';
import { getHybridAuth } from '@/lib/standard-auth';
import { checkIsSuperAdmin } from '@/lib/user-utils';
import { getServiceSupabase } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [CheckSuperAdmin] Starting authentication check...');
    
    // Method 1: Try hybrid auth first
    const authResult = await getHybridAuth(request);
    console.log('🔍 [CheckSuperAdmin] Hybrid auth result:', {
      userId: authResult.userId ? 'present' : 'missing',
      authMethod: authResult.authMethod,
      hasSession: !!authResult.session
    });
    
    let userId: string | null = authResult.userId;
    let userEmail = '';
    
    // Method 2: If hybrid auth failed, try direct Supabase client approach
    if (!userId) {
      console.log('🔍 [CheckSuperAdmin] Trying direct Supabase client approach...');
      
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
          console.log('✅ [CheckSuperAdmin] Direct Supabase auth successful for user:', user.id);
          userId = user.id;
          userEmail = user.email || '';
        } else {
          console.log('⚠️ [CheckSuperAdmin] Direct Supabase auth failed:', error?.message);
        }
      } catch (directAuthError) {
        console.log('⚠️ [CheckSuperAdmin] Direct auth error:', directAuthError);
      }
    }
    
    // Method 3: If still no user, try Authorization header
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        console.log('🔍 [CheckSuperAdmin] Trying Authorization header auth...');
        
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
            console.log('✅ [CheckSuperAdmin] Bearer token auth successful for user:', user.id);
            userId = user.id;
            userEmail = user.email || '';
          }
        } catch (tokenError) {
          console.log('⚠️ [CheckSuperAdmin] Bearer token auth failed:', tokenError);
        }
      }
    }
    
    if (!userId) {
      console.log('❌ [CheckSuperAdmin] All authentication methods failed');
      return NextResponse.json(
        { isSuperAdmin: false, error: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // Get email if we don't have it yet
    if (!userEmail && authResult.session?.user?.email) {
      userEmail = authResult.session.user.email;
    } else if (!userEmail) {
      // Fallback: hämta email från databasen
      const supabase = getServiceSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      userEmail = profile?.email || '';
    }

    console.log('🔍 [CheckSuperAdmin] Final user info:', {
      userId: userId,
      email: userEmail ? 'present' : 'missing'
    });

    // Kontrollera superadmin-behörighet
    const supabase = getServiceSupabase();
    const isSuperAdmin = await checkIsSuperAdmin(
      supabase,
      userId,
      userEmail
    );

    console.log('✅ [CheckSuperAdmin] Superadmin check complete:', { isSuperAdmin });

    return NextResponse.json({
      isSuperAdmin,
      userId: userId,
      email: userEmail
    });
    
  } catch (error) {
    console.error('❌ [CheckSuperAdmin] Error checking superadmin status:', error);
    return NextResponse.json(
      { isSuperAdmin: false, error: "Fel vid kontroll av admin-status" },
      { status: 500 }
    );
  }
} 