import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

export async function PATCH(request: NextRequest) {
  try {
    // 1. Hämta och validera session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Kontrollera att användaren är superadmin
    const supabase = getServiceSupabase();
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError || !profile?.is_superadmin) {
      return NextResponse.json(
        { success: false, message: "Du har inte superadmin-behörighet" },
        { status: 403 }
      );
    }

    // 3. Validera indata
    const { userId, handbookId, role } = await request.json();
    
    if (!userId || !handbookId || !role) {
      return NextResponse.json(
        { success: false, message: "Ofullständiga uppgifter" },
        { status: 400 }
      );
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Ogiltig roll" },
        { status: 400 }
      );
    }

    // 4. Kontrollera att handboken finns
    const { data: handbook, error: handbookError } = await supabase
      .from("handbooks")
      .select("id, title")
      .eq("id", handbookId)
      .maybeSingle();

    if (handbookError || !handbook) {
      return NextResponse.json(
        { success: false, message: "Handboken hittades inte" },
        { status: 404 }
      );
    }

    // 5. Kontrollera att användaren finns
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const targetUser = authUsers?.users.find(u => u.id === userId);
    
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Användaren hittades inte" },
        { status: 404 }
      );
    }

    // 6. Kontrollera om användaren redan är medlem
    const { data: existingMember, error: memberError } = await supabase
      .from("handbook_members")
      .select("id, role")
      .eq("handbook_id", handbookId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      console.error("Fel vid kontroll av medlemskap:", memberError);
      return NextResponse.json(
        { success: false, message: "Kunde inte kontrollera medlemskap" },
        { status: 500 }
      );
    }

    if (existingMember) {
      // 7. Uppdatera befintlig medlems roll
      const { error: updateError } = await supabase
        .from("handbook_members")
        .update({ role })
        .eq("id", existingMember.id);

      if (updateError) {
        console.error("Fel vid uppdatering av roll:", updateError);
        return NextResponse.json(
          { success: false, message: "Kunde inte uppdatera användarens roll" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${targetUser.email}s roll i ${handbook.title} har uppdaterats till ${role}`,
        action: 'updated'
      });
    } else {
      // 8. Lägg till användaren som ny medlem
      const { error: insertError } = await supabase
        .from("handbook_members")
        .insert({
          handbook_id: handbookId,
          user_id: userId,
          role: role
        });

      if (insertError) {
        console.error("Fel vid tillägg av medlem:", insertError);
        return NextResponse.json(
          { success: false, message: "Kunde inte lägga till användaren" },
          { status: 500 }
        );
      }

      // 9. Skapa notifikationsinställningar för ny medlem
      const { error: notificationError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: userId,
          handbook_id: handbookId,
          email_new_topics: true,
          email_new_replies: true,
          email_mentions: true,
          app_new_topics: true,
          app_new_replies: true,
          app_mentions: true
        });

      if (notificationError) {
        console.error("Fel vid skapande av notifikationsinställningar:", notificationError);
        // Fortsätt ändå, detta är inte kritiskt
      }

      return NextResponse.json({
        success: true,
        message: `${targetUser.email} har lagts till i ${handbook.title} som ${role}`,
        action: 'added'
      });
    }
  } catch (error) {
    console.error("Oväntat fel vid uppdatering av handbok-roll:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Hämta och validera session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Kontrollera att användaren är superadmin
    const supabase = getServiceSupabase();
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError || !profile?.is_superadmin) {
      return NextResponse.json(
        { success: false, message: "Du har inte superadmin-behörighet" },
        { status: 403 }
      );
    }

    // 3. Validera indata
    const { userId, handbookId } = await request.json();
    
    if (!userId || !handbookId) {
      return NextResponse.json(
        { success: false, message: "Ofullständiga uppgifter" },
        { status: 400 }
      );
    }

    // 4. Ta bort medlemskap
    const { error: deleteError } = await supabase
      .from("handbook_members")
      .delete()
      .eq("handbook_id", handbookId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Fel vid borttagning av medlem:", deleteError);
      return NextResponse.json(
        { success: false, message: "Kunde inte ta bort medlemskap" },
        { status: 500 }
      );
    }

    // 5. Ta bort notifikationsinställningar
    const { error: notificationDeleteError } = await supabase
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('handbook_id', handbookId);

    if (notificationDeleteError) {
      console.error("Fel vid borttagning av notifikationsinställningar:", notificationDeleteError);
      // Fortsätt ändå, detta är inte kritiskt
    }

    return NextResponse.json({
      success: true,
      message: "Användaren har tagits bort från handboken"
    });
  } catch (error) {
    console.error("Oväntat fel vid borttagning av handbok-medlem:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 