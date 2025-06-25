import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { getServiceSupabase } from "@/lib/supabase";
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

    const supabase = getServiceSupabase();

    // Kontrollera om subdomänen redan används
    const { data: existingHandbook, error: checkError } = await supabase
      .from("handbooks")
      .select("id")
      .eq("slug", subdomain) // Använd slug istället för subdomain
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

    console.log("[Create Handbook API] Användare kan skapa flera handböcker, ingen begränsning");

    console.log("[Create Handbook API] Anropar createHandbookWithSectionsAndPages med completeBRFHandbook");
    
    // Använd den rika templaten för att skapa handboken
    // Parametrar: name, slug, userId, isTrialHandbook, customTemplate
    const handbook = await createHandbookWithSectionsAndPages(
      name, 
      subdomain, 
      user_id,
      true, // isTrialHandbook = true för nya handböcker
      completeBRFHandbook
    );
    
    const handbookId = handbook.id;

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