import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { defaultHandbookTemplate } from '@/lib/templates/handbook-template';
import { supabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/user-utils";

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

    console.log("[Create Handbook API] Anropar createHandbookWithSectionsAndPages med defaultHandbookTemplate");
    
    // Använd den rika templaten för att skapa handboken
    const handbookId = await createHandbookWithSectionsAndPages(
      name, 
      subdomain, 
      defaultHandbookTemplate, 
      user_id
    );

    console.log("[Create Handbook API] Handbok skapad med ID:", handbookId);

    // Returnera handbok-ID och subdomän
    return NextResponse.json({
      id: handbookId,
      subdomain,
      url: `https://${subdomain}.handbok.org`,
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