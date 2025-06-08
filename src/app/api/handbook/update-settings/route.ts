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

    // 2. Validera indata
    const { handbookId, forum_enabled } = await request.json();
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "Handbook ID krävs" },
        { status: 400 }
      );
    }

    if (typeof forum_enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, message: "forum_enabled måste vara en boolean" },
        { status: 400 }
      );
    }

    // 3. Kontrollera att användaren har admin-behörighet för handboken
    const supabase = getServiceSupabase();
    
    const { data: adminCheck, error: adminError } = await supabase
      .from("handbook_members")
      .select("id")
      .eq("handbook_id", handbookId)
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminError) {
      console.error("Fel vid kontroll av admin-behörighet:", adminError);
      return NextResponse.json(
        { success: false, message: "Kunde inte verifiera admin-behörighet" },
        { status: 500 }
      );
    }

    if (!adminCheck) {
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    // 4. Uppdatera handbok-inställningar
    const { error: updateError } = await supabase
      .from("handbooks")
      .update({ 
        forum_enabled,
        updated_at: new Date().toISOString()
      })
      .eq("id", handbookId);

    if (updateError) {
      console.error("Fel vid uppdatering av handbok-inställningar:", updateError);
      return NextResponse.json(
        { success: false, message: "Kunde inte uppdatera handbok-inställningar" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Forum ${forum_enabled ? 'aktiverat' : 'inaktiverat'}`
    });
  } catch (error) {
    console.error("Oväntat fel vid uppdatering av handbok-inställningar:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 