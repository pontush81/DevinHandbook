import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { adminAuth } from '@/lib/security-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Standardiserad admin-autentisering
    const authResult = await adminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    // 2. Hämta användare (nu säkert)
    const supabase = getServiceSupabase();
    console.log('🔐 Superadmin', authResult.userId, 'fetching user list');
    
    // Hämta alla användare från auth
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    // Hämta alla profiler för superadmin-status
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_superadmin');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Hämta alla handbok-medlemskap med handbok-information
    const { data: memberships, error: membershipError } = await supabase
      .from('handbook_members')
      .select(`
        user_id,
        role,
        handbook_id,
        handbooks (
          id,
          title,
          slug
        )
      `);
    
    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
    }
    
    // Bygg upp användare med deras handbok-information
    const users = data.users.map(user => {
      // Hitta profil för superadmin-status
      const profile = profiles?.find(p => p.id === user.id);
      
      // Hitta alla handböcker för denna användare
      const userMemberships = memberships?.filter(m => m.user_id === user.id) || [];
      
      // Gruppera roller per handbok
      const handbooks = userMemberships.map(membership => ({
        id: membership.handbook_id,
        title: membership.handbooks?.title || 'Okänd handbok',
        slug: membership.handbooks?.slug,
        role: membership.role
      }));
      
      // Samla unika roller
      const roles = [...new Set(userMemberships.map(m => m.role))];
      const isHandbookAdmin = roles.includes('admin');
      const isHandbookEditor = roles.includes('editor');
      const isHandbookViewer = roles.includes('viewer');
      
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        app_metadata: user.app_metadata,
        // BRF/Handbok information
        handbooks: handbooks,
        handbook_count: handbooks.length,
        // Rollsammanfattning - använd profiles.is_superadmin istället för app_metadata
        is_superadmin: profile?.is_superadmin === true,
        is_handbook_admin: isHandbookAdmin,
        is_handbook_editor: isHandbookEditor,
        is_handbook_viewer: isHandbookViewer,
        roles: roles,
        primary_role: isHandbookAdmin ? 'admin' : isHandbookEditor ? 'editor' : isHandbookViewer ? 'viewer' : 'none'
      };
    });
    
    return NextResponse.json({ data: users });
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
