import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

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

    // 2. Validera indata
    const { handbookId, memberId } = await request.json();
    
    if (!handbookId || !memberId) {
      return NextResponse.json(
        { success: false, message: "Ofullständiga uppgifter" },
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

    // 4. Kontrollera att medlemmen finns och tillhör den angivna handboken
    const { data: member, error: memberError } = await supabase
      .from("handbook_members")
      .select("id, user_id")
      .eq("id", memberId)
      .eq("handbook_id", handbookId)
      .maybeSingle();

    if (memberError) {
      console.error("Fel vid kontroll av medlemskap:", memberError);
      return NextResponse.json(
        { success: false, message: "Kunde inte verifiera medlemskap" },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Medlemmen hittades inte" },
        { status: 404 }
      );
    }

    // 5. Förhindra att användaren tar bort sig själv som admin
    if (member.user_id === session.user.id) {
      return NextResponse.json(
        { success: false, message: "Du kan inte ta bort dig själv som administratör" },
        { status: 403 }
      );
    }

    // 6. Ta bort medlemmen från handboken
    const { error: deleteError } = await supabase
      .from("handbook_members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      console.error("Fel vid borttagning av medlem:", deleteError);
      return NextResponse.json(
        { success: false, message: "Kunde inte ta bort medlemmen" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Medlemmen har tagits bort"
    });
  } catch (error) {
    console.error("Oväntat fel vid borttagning av medlem:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 