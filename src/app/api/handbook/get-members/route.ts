import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Hämta och validera session eller userId från query params
    const session = await getServerSession();
    const { searchParams } = new URL(request.url);
    const handbookId = searchParams.get('handbookId');
    const queryUserId = searchParams.get('userId'); // Fallback för när session inte fungerar
    
    // Använd session userId om tillgänglig, annars fallback till query param
    const userId = session?.user?.id || queryUserId;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "Handbook ID krävs" },
        { status: 400 }
      );
    }

    // 3. Kontrollera att användaren har admin-behörighet för handboken
    const supabase = getServiceSupabase();
    
    const { data: adminCheck, error: adminError } = await supabase
      .from("handbook_members")
      .select("id")
      .eq("handbook_id", handbookId)
      .eq("user_id", userId)
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

    // 4. Hämta medlemmar först
    const { data: members, error: membersError } = await supabase
      .from('handbook_members')
      .select('id, user_id, role, created_at')
      .eq('handbook_id', handbookId);

    if (membersError) {
      console.error("Fel vid hämtning av medlemmar:", membersError);
      return NextResponse.json(
        { success: false, message: "Kunde inte hämta medlemmar" },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      console.log(`[get-members] Inga medlemmar funna för handbok ${handbookId}`);
      return NextResponse.json({
        success: true,
        members: []
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // 5. Hämta användardata för alla medlemmar
    const membersWithEmails = [];
    
    for (const member of members) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(member.user_id);
        
        const email = userData?.user?.email || "Okänd e-post";
        
        membersWithEmails.push({
          id: member.id,
          user_id: member.user_id,
          email: email,
          role: member.role,
          created_at: member.created_at,
        });
        
        console.log(`[get-members] Medlem ${member.user_id}: ${email} (${member.role})`);
      } catch (userError) {
        console.error(`Kunde inte hämta användardata för ${member.user_id}:`, userError);
        // Lägg till medlemmen ändå, bara utan e-post
        membersWithEmails.push({
          id: member.id,
          user_id: member.user_id,
          email: "Okänd e-post",
          role: member.role,
          created_at: member.created_at,
        });
      }
    }

    console.log(`[get-members] Returnerar ${membersWithEmails.length} medlemmar för handbok ${handbookId}`);

    return NextResponse.json({
      success: true,
      members: membersWithEmails
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Oväntat fel vid hämtning av medlemmar:", error);
    return NextResponse.json(
      { success: false, message: "Ett oväntat fel inträffade" },
      { status: 500 }
    );
  }
} 