import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { handbookId, email, role = 'admin' } = await request.json();
    
    if (!handbookId || !email) {
      return NextResponse.json(
        { error: "handbookId och email krävs" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    
    // 1. Hitta användaren baserat på e-post
    const { data: authUsers, error: userSearchError } = await supabase.auth.admin.listUsers();
    
    if (userSearchError) {
      return NextResponse.json(
        { error: "Kunde inte söka användare", details: userSearchError },
        { status: 500 }
      );
    }

    const targetUser = authUsers.users.find(user => user.email === email);
    
    if (!targetUser) {
      return NextResponse.json(
        { error: `Användare med e-post ${email} finns inte` },
        { status: 404 }
      );
    }

    // 2. Kontrollera om användaren redan är medlem
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('handbook_members')
      .select('id, role')
      .eq('handbook_id', handbookId)
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (memberCheckError) {
      return NextResponse.json(
        { error: "Kunde inte kontrollera befintligt medlemskap", details: memberCheckError },
        { status: 500 }
      );
    }

    if (existingMember) {
      return NextResponse.json({
        success: true,
        message: `Användaren ${email} är redan medlem med rollen ${existingMember.role}`,
        member: {
          id: existingMember.id,
          email: email,
          role: existingMember.role,
          action: 'already_member'
        }
      });
    }

    // 3. Lägg till användaren som medlem
    const { data: newMember, error: insertError } = await supabase
      .from('handbook_members')
      .insert({
        handbook_id: handbookId,
        user_id: targetUser.id,
        role: role,
        created_at: new Date().toISOString()
      })
      .select('id, role')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Kunde inte lägga till medlem", details: insertError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Användaren ${email} har lagts till som ${role}`,
      member: {
        id: newMember.id,
        email: email,
        role: newMember.role,
        action: 'added'
      }
    });
  } catch (error: any) {
    console.error("Fel vid tillägg av medlem:", error);
    return NextResponse.json(
      { error: "Ett oväntat fel inträffade", details: error.message },
      { status: 500 }
    );
  }
} 