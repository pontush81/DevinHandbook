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

    // Kontrollera om profilen redan finns (både ID och e-post)
    const { data: existingProfile, error: checkError } = await adminClient
      .from('profiles')
      .select('id, email')
      .or(`id.eq.${user_id},email.eq.${email}`)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[API] Fel vid kontroll av profil:', checkError);
      return NextResponse.json(
        { error: "Kunde inte kontrollera om profilen finns" },
        { status: 500 }
      );
    }

    // Om profilen redan finns, hantera olika scenarier
    if (existingProfile) {
      if (existingProfile.id === user_id && existingProfile.email === email) {
        // Exakt samma profil finns redan - detta är OK
        console.log('[API] Profil finns redan med samma ID och e-post - returnerar success');
        return NextResponse.json({ 
          success: true, 
          created: false, 
          message: "Profil finns redan" 
        });
      } else if (existingProfile.email === email && existingProfile.id !== user_id) {
        // E-posten används av annan profil - detta är ett problem
        console.warn('[API] E-posten används redan av annan användare:', { 
          requestedUserId: user_id, 
          existingUserId: existingProfile.id, 
          email 
        });
        return NextResponse.json({ 
          success: false, 
          error: "E-postadressen används redan av ett annat konto",
          code: "EMAIL_ALREADY_EXISTS"
        }, { status: 409 });
      } else if (existingProfile.id === user_id && existingProfile.email !== email) {
        // Användar-ID finns men med annan e-post - uppdatera e-posten
        console.log('[API] Uppdaterar e-post för befintlig profil');
        const { error: updateError } = await adminClient
          .from('profiles')
          .update({ email: email })
          .eq('id', user_id);

        if (updateError) {
          console.error('[API] Fel vid uppdatering av e-post:', updateError);
          // Om det är duplicate email error, hantera det
          if (updateError.code === '23505' && updateError.message.includes('profiles_email_key')) {
            return NextResponse.json({ 
              success: false, 
              error: "E-postadressen används redan av ett annat konto",
              code: "EMAIL_ALREADY_EXISTS"
            }, { status: 409 });
          }
          return NextResponse.json(
            { error: "Kunde inte uppdatera e-post", details: updateError },
            { status: 500 }
          );
        }

        return NextResponse.json({ 
          success: true, 
          created: false, 
          updated: true,
          message: "Profil uppdaterad med ny e-post" 
        });
      }
    }

    // Skapa profilen med INSERT ... ON CONFLICT för att hantera race conditions
    const { error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: user_id,
        email: email,
        is_superadmin: false,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      // Hantera specifika constraint violations
      if (insertError.code === '23505') {
        if (insertError.message.includes('profiles_email_key')) {
          console.warn('[API] E-post constraint violation:', insertError.details);
          return NextResponse.json({ 
            success: false, 
            error: "E-postadressen används redan av ett annat konto",
            code: "EMAIL_ALREADY_EXISTS"
          }, { status: 409 });
        } else if (insertError.message.includes('profiles_pkey')) {
          console.warn('[API] Användar-ID constraint violation - profil finns redan');
          return NextResponse.json({ 
            success: true, 
            created: false,
            message: "Profil finns redan" 
          });
        }
      }

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

    console.log('[API] Profil skapad framgångsrikt för användare:', user_id);
    return NextResponse.json({ 
      success: true, 
      created: true,
      message: "Profil skapad framgångsrikt" 
    });
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