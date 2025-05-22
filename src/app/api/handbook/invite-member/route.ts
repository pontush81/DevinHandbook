import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
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
    const { handbookId, email, role } = await request.json();
    
    if (!handbookId || !email || !role) {
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

    // 4. Hitta användaren baserat på e-post
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      console.error("Fel vid sökning efter användare:", userError);
      return NextResponse.json(
        { success: false, message: "Kunde inte söka efter användaren" },
        { status: 500 }
      );
    }

    let userId: string;
    
    if (!user) {
      // 5a. Användaren finns inte, registrera en inbjudan
      // TODO: Implementera inbjudningssystem om det behövs
      return NextResponse.json(
        { success: false, message: "Användaren finns inte i systemet. Inbjudningar till nya användare är inte implementerat ännu." },
        { status: 404 }
      );
    } else {
      userId = user.id;

      // 5b. Kontrollera om användaren redan är medlem
      const { data: existingMember, error: memberError } = await supabase
        .from("handbook_members")
        .select("id")
        .eq("handbook_id", handbookId)
        .eq("user_id", userId)
        .maybeSingle();

      if (memberError) {
        console.error("Fel vid kontroll av befintligt medlemskap:", memberError);
        return NextResponse.json(
          { success: false, message: "Kunde inte kontrollera befintligt medlemskap" },
          { status: 500 }
        );
      }

      if (existingMember) {
        // 6a. Uppdatera roll om användaren redan är medlem
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
          message: "Användarens roll har uppdaterats"
        });
      } else {
        // 6b. Lägg till användaren som medlem
        const { error: insertError } = await supabase
          .from("handbook_members")
          .insert({
            handbook_id: handbookId,
            user_id: userId,
            role,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error("Fel vid tillägg av medlem:", insertError);
          return NextResponse.json(
            { success: false, message: "Kunde inte lägga till användaren som medlem" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Användaren har lagts till som medlem"
        });
      }
    }
  } catch (error) {
    console.error("Oväntat fel vid inbjudan av medlem:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 