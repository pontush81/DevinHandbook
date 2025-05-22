import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

/**
 * API-rutt för att skapa användarprofiler med service role (kringgår RLS)
 * Denna rutt är avsedd att användas när RLS-policyn hindrar direkt skapande av profiler
 */
export async function POST(req: NextRequest) {
  try {
    const { user_id, email } = await req.json();

    // Validera indata
    if (!user_id || !email) {
      return NextResponse.json(
        { error: "Användar-ID och e-post krävs" },
        { status: 400 }
      );
    }

    // Använd admin-klienten för att kringgå RLS
    const adminClient = getAdminClient();

    // Kontrollera om profilen redan finns
    const { data: existingProfile, error: checkError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .maybeSingle();

    if (checkError) {
      console.error('[API] Fel vid kontroll av profil:', checkError);
      return NextResponse.json(
        { error: "Kunde inte kontrollera om profilen finns" },
        { status: 500 }
      );
    }

    // Om profilen redan finns, returnera success
    if (existingProfile) {
      return NextResponse.json({ success: true, created: false });
    }

    // Skapa profilen
    const { error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: user_id,
        email: email,
        is_superadmin: false,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[API] Fel vid skapande av profil:', insertError);
      
      // Logga detaljerad felinformation
      if (insertError.message) {
        console.error('[API] Felmeddelande:', insertError.message);
      }
      if (insertError.details) {
        console.error('[API] Feldetaljer:', insertError.details);
      }
      
      return NextResponse.json(
        { error: "Kunde inte skapa profil", details: insertError },
        { status: 500 }
      );
    }

    // Verifiera att profilen skapades
    const { data: confirmProfile, error: confirmError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .maybeSingle();

    if (confirmError || !confirmProfile) {
      console.error('[API] Kunde inte bekräfta profilskapande:', confirmError);
      return NextResponse.json(
        { error: "Profilen skapades men kunde inte bekräftas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, created: true });
  } catch (error) {
    console.error('[API] Oväntat fel vid profilskapande:', error);
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