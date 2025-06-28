import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession, isHandbookAdmin } from '@/lib/auth-utils';

export async function DELETE(request: NextRequest) {
  try {
    // 1. Hämta och validera session eller userId från request body
    const session = await getServerSession();
    const { handbookId, memberId, userId: bodyUserId } = await request.json();
    
    // Använd session userId om tillgänglig, annars fallback till request body
    const userId = session?.user?.id || bodyUserId;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad - ingen användar-ID tillgänglig" },
        { status: 401 }
      );
    }

    if (!handbookId || !memberId) {
      return NextResponse.json(
        { success: false, message: "handbookId och memberId krävs" },
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

    // Kontrollera att medlemmen finns och tillhör handboken
    const { data: member, error: memberError } = await supabase
      .from('handbook_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('handbook_id', handbookId)
      .single();

    if (memberError) {
      console.error('Error finding member:', memberError);
      return NextResponse.json(
        { success: false, message: "Medlem hittades inte" },
        { status: 404 }
      );
    }

    // Förhindra att användaren tar bort sig själv
    if (member.user_id === userId) {
      return NextResponse.json(
        { success: false, message: "Du kan inte ta bort dig själv från handboken" },
        { status: 400 }
      );
    }

    // Ta bort medlemmen
    const { error } = await supabase
      .from('handbook_members')
      .delete()
      .eq('id', memberId)
      .eq('handbook_id', handbookId);

    if (error) {
      console.error('Error removing member:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte ta bort medlem" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Medlem borttagen"
    });

  } catch (error) {
    console.error('Error in DELETE /api/handbook/remove-member:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
} 