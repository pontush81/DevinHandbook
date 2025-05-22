import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { supabase } from "@/lib/supabase";
import { getAdminClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/user-utils";

export async function POST(req: NextRequest) {
  try {
    const { name, subdomain, user_id } = await req.json();

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

    // Skapa handbok med admin client för att kringgå RLS
    const adminClient = getAdminClient();

    // Säkerställ att användaren har en profil
    const { data: userCheck } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (!userCheck) {
      // Hämta användarens e-post för att skapa profil
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(user_id);

      if (userError || !userData?.user) {
        console.error("Kunde inte hämta användardata:", userError);
        return NextResponse.json(
          { error: "Kunde inte verifiera användaren" },
          { status: 500 }
        );
      }

      // Skapa användarprofil om den inte finns
      await ensureUserProfile(supabase, user_id, userData.user.email || "");
    }

    // Skapa handboken
    const { data: handbook, error: createError } = await adminClient
      .from("handbooks")
      .insert({
        name,
        subdomain,
        user_id,
        published: true,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Fel vid skapande av handbok:", createError);
      return NextResponse.json(
        { error: "Kunde inte skapa handbok" },
        { status: 500 }
      );
    }

    // Tilldela admin-roll till användaren
    const { error: membershipError } = await adminClient
      .from("handbook_members")
      .insert({
        handbook_id: handbook.id,
        user_id,
        role: "admin", // Explicit sätt rollen till admin
        created_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.error("Fel vid tilldelning av admin-roll:", membershipError);
      // Vi fortsätter ändå eftersom handboken har skapats
      // Alternativt kan vi ta bort handboken och returnera ett fel
    }

    // Skapa en initial sektion
    const { data: section, error: sectionError } = await adminClient
      .from("sections")
      .insert({
        handbook_id: handbook.id,
        title: "Välkommen",
        description: "Grundläggande information om föreningen",
        order: 1,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sectionError) {
      console.error("Fel vid skapande av sektion:", sectionError);
      // Fortsätt ändå
    }

    // Skapa standardsidor om sektionen skapades
    if (section) {
      const defaultPages = [
        {
          section_id: section.id,
          title: "Om föreningen",
          content: `# Om vår förening\n\nHär finner du grundläggande information om vår bostadsrättsförening, inklusive historia, vision och kontaktuppgifter.\n\n## Fakta om föreningen\n\n* **Bildad år:** [Årtal]\n* **Antal lägenheter:** [Antal]\n* **Adress:** [Föreningens adress]\n* **Organisationsnummer:** [Org.nr]\n\nVår förening strävar efter att skapa en trivsam boendemiljö med god gemenskap och ekonomisk stabilitet. Vi uppmuntrar alla medlemmar att engagera sig i föreningens angelägenheter.`,
          order: 1,
          created_at: new Date().toISOString(),
        },
        {
          section_id: section.id,
          title: "För nya medlemmar",
          content: `# Information för nya medlemmar\n\nDetta avsnitt innehåller praktisk information som är särskilt användbar för dig som är ny medlem i föreningen.\n\n## Viktigt att känna till\n\n* Styrelsen håller möten regelbundet och årsstämma hålls vanligtvis i [månad].\n* Felanmälan görs via [metod för felanmälan].\n* I denna handbok hittar du svar på många vanliga frågor om boendet.\n\n## Första tiden i föreningen\n\nVi rekommenderar att du bekantar dig med föreningens stadgar och trivselregler. Ta gärna kontakt med dina grannar och styrelsen om du har frågor om föreningen eller fastigheten.`,
          order: 2,
          created_at: new Date().toISOString(),
        },
      ];

      for (const page of defaultPages) {
        const { error: pageError } = await adminClient
          .from("pages")
          .insert(page);

        if (pageError) {
          console.error("Fel vid skapande av sida:", pageError);
          // Fortsätt ändå
        }
      }
    }

    // Returnera handbok-ID och subdomän
    return NextResponse.json({
      id: handbook.id,
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