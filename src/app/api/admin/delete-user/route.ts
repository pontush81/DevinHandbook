import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { adminAuth } from '@/lib/security-utils';

export async function POST(request: NextRequest) {
  const authResult = await adminAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email krävs" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    
    // 1. Hitta användaren
    const { data: authUsers, error: userSearchError } = await supabase.auth.admin.listUsers();
    
    if (userSearchError) {
      return NextResponse.json(
        { error: "Kunde inte söka användare", details: userSearchError },
        { status: 500 }
      );
    }

    const targetUser = authUsers.users.find(user => user.email === email);
    
    if (!targetUser) {
      return NextResponse.json(
        { error: `Användare med e-post ${email} finns inte` },
        { status: 404 }
      );
    }

    // 2. Ta bort från handbook_members
    const { error: memberDeleteError } = await supabase
      .from('handbook_members')
      .delete()
      .eq('user_id', targetUser.id);

    if (memberDeleteError) {
      console.error("Fel vid borttagning av medlemskap:", memberDeleteError);
    }

    // 3. Ta bort från user_notification_preferences
    const { error: notificationDeleteError } = await supabase
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', targetUser.id);

    if (notificationDeleteError) {
      console.error("Fel vid borttagning av notifikationsinställningar:", notificationDeleteError);
    }

    // 4. Ta bort från profiles (om det finns)
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetUser.id);

    if (profileDeleteError) {
      console.error("Fel vid borttagning av profil:", profileDeleteError);
    }

    // 5. Ta bort användaren från auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(targetUser.id);

    if (authDeleteError) {
      return NextResponse.json(
        { error: "Kunde inte ta bort användare från auth", details: authDeleteError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Användaren ${email} har tagits bort helt från systemet`,
      deletedUserId: targetUser.id
    });
  } catch (error: any) {
    console.error("Fel vid borttagning av användare:", error);
    return NextResponse.json(
      { error: "Ett oväntat fel inträffade", details: error.message },
      { status: 500 }
    );
  }
} 