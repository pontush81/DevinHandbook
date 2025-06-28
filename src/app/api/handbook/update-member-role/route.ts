import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

export async function PATCH(request: NextRequest) {
  try {
    // 1. Hämta och validera session eller userId från request body
    const session = await getServerSession();
    const { handbookId, memberId, role, userId: bodyUserId } = await request.json();
    
    // Använd session userId om tillgänglig, annars fallback till request body
    const userId = session?.user?.id || bodyUserId;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    if (!handbookId || !memberId || !role) {
      return NextResponse.json(
        { success: false, message: "handbookId, memberId och role krävs" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Kontrollera att användaren är admin för handboken
    const adminCheck = await isHandbookAdmin(userId, handbookId);
    if (!adminCheck) {
      return NextResponse.json(
        { success: false, message: "Du har inte admin-behörighet för denna handbok" },
        { status: 403 }
      );
    }

    // Uppdatera medlemmens roll
    const { error } = await supabase
      .from('handbook_members')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('handbook_id', handbookId);

    if (error) {
      console.error('Error updating member role:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte uppdatera medlemsroll" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Medlemsroll uppdaterad"
    });

  } catch (error) {
    console.error('Error in PATCH /api/handbook/update-member-role:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
} 