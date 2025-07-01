import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { getServiceSupabase } from "@/lib/supabase";
import { ensureUserProfile, checkIsSuperAdmin } from "@/lib/user-utils";
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';
import { getHybridAuth } from '@/lib/standard-auth';
import { validateSubdomain, sanitizeText } from '@/lib/validation-utils';

export async function POST(req: NextRequest) {
  const authResult = await getHybridAuth(req);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, subdomain } = await req.json();
    const user_id = authResult.user.id;

    // Validera och sanitisera indata
    if (!name || !subdomain) {
      return NextResponse.json(
        { error: "Namn och subdomän krävs" },
        { status: 400 }
      );
    }

    const nameValidation = sanitizeText(name);
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    const subdomainValidation = validateSubdomain(subdomain);
    if (!subdomainValidation.isValid) {
      return NextResponse.json(
        { error: subdomainValidation.error },
        { status: 400 }
      );
    }

    const sanitizedName = nameValidation.sanitized!;
    const sanitizedSubdomain = subdomainValidation.sanitized!;

    console.log("[Create Handbook API] Skapar handbok med rik template:", { 
      name: sanitizedName, 
      subdomain: sanitizedSubdomain, 
      user_id 
    });

    const supabase = getServiceSupabase();

    // Kontrollera om subdomänen redan används
    const { data: existingHandbook, error: checkError } = await supabase
      .from("handbooks")
      .select("id")
      .eq("slug", sanitizedSubdomain)
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
      sanitizedName, 
      sanitizedSubdomain, 
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
      subdomain: sanitizedSubdomain,
      url: `https://www.handbok.org/${sanitizedSubdomain}`,
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