import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { supabase } from "@/lib/supabase";
import { ensureUserProfile, checkIsSuperAdmin } from "@/lib/user-utils";
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';

export async function POST(req: NextRequest) {
  try {
    const { name, subdomain, user_id } = await req.json();

    console.log("[Create Handbook API] Skapar handbok med rik template:", { name, subdomain, user_id });

    // Verifiera indata
    if (!name || !subdomain || !user_id) {
      return NextResponse.json(
        { error: "Namn, subdomän och användar-ID krävs" },
        { status: 400 }
      );
    }

    // Kontrollera om subdomänen redan används
    const { data: existingHandbook, error: checkError } = await supabase
      .from("handbooks")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (checkError) {
      console.error("Fel vid kontroll av subdomän:", checkError);
      return NextResponse.json(
        { error: "Kunde inte kontrollera subdomän" },
        { status: 500 }
      );
    }

    if (existingHandbook) {
      return NextResponse.json(
        { error: "Denna subdomän är redan tagen" },
        { status: 409 }
      );
    }

    // Säkerställ att användaren har en profil först
    await ensureUserProfile(supabase, user_id, "");

    // Kontrollera om användaren är superadmin
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    const userEmail = userData?.user?.email || "";
    const isSuperAdmin = await checkIsSuperAdmin(supabase, user_id, userEmail);

    // Kontrollera handboksbegränsning för icke-superadmins
    if (!isSuperAdmin) {
      const { data: userHandbooks, error: handbooksError } = await supabase
        .from("handbooks")
        .select("id")
        .eq("owner_id", user_id);

      if (handbooksError) {
        console.error("Fel vid kontroll av användarens handböcker:", handbooksError);
        return NextResponse.json(
          { error: "Kunde inte kontrollera befintliga handböcker" },
          { status: 500 }
        );
      }

      if (userHandbooks && userHandbooks.length >= 1) {
        return NextResponse.json(
          { error: "Du kan endast skapa en handbok med ditt nuvarande konto. Uppgradera till Pro för fler handböcker." },
          { status: 403 }
        );
      }
    }

    console.log("[Create Handbook API] Anropar createHandbookWithSectionsAndPages med completeBRFHandbook");
    
    // Använd den rika templaten för att skapa handboken
    const handbookId = await createHandbookWithSectionsAndPages(
      name, 
      subdomain, 
      completeBRFHandbook, 
      user_id
    );

    console.log("[Create Handbook API] Handbok skapad med ID:", handbookId);

    // Returnera handbok-ID och subdomän
    return NextResponse.json({
      success: true, 
      message: 'Handbook created successfully',
      handbook_id: handbookId,
      subdomain,
      url: `https://www.handbok.org/${subdomain}`,
    });
  } catch (error) {
    console.error("Oväntat fel vid skapande av handbok:", error);
    return NextResponse.json(
      { error: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
}

// För att undvika CORS-problem vid lokalt testande
export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    } 
  });
}