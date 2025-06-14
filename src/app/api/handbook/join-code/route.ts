import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

// POST - Create/update a join code for a handbook
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    const { handbookId, expiresInDays = 30 } = await request.json();
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "handbook_id krävs" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    
    // Call the stored function to create join code
    const { data, error } = await supabase
      .rpc('create_handbook_join_code', {
        handbook_id: handbookId,
        user_id: session.user.id,
        expires_in_days: expiresInDays
      });

    if (error) {
      console.error('Error creating join code:', error);
      
      if (error.message.includes('Only handbook admins')) {
        return NextResponse.json(
          { success: false, message: "Du har inte admin-behörighet för denna handbok" },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: "Kunde inte skapa join-kod" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      joinCode: data,
      message: "Join-kod skapad"
    });

  } catch (error) {
    console.error('Error in POST /api/handbook/join-code:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
}

// GET - Get current join code for a handbook
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const handbookId = url.searchParams.get('handbookId');
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "handbookId krävs som query parameter" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    
    // Check if user is admin of this handbook
    const { data: adminCheck, error: adminError } = await supabase
      .from("handbook_members")
      .select("id")
      .eq("handbook_id", handbookId)
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminError) {
      console.error('Fel vid kontroll av admin-behörighet:', adminError);
      return NextResponse.json(
        { success: false, message: 'Kunde inte verifiera admin-behörighet' },
        { status: 500 }
      );
    }

    if (!adminCheck) {
      return NextResponse.json(
        { success: false, message: 'Du har inte admin-behörighet för denna handbok' },
        { status: 403 }
      );
    }

    // Get current join code
    const { data: handbook, error } = await supabase
      .from('handbooks')
      .select('join_code, join_code_expires_at, join_code_active')
      .eq('id', handbookId)
      .single();

    if (error) {
      console.error('Error getting join code:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte hämta join-kod" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      joinCode: handbook.join_code,
      expiresAt: handbook.join_code_expires_at,
      isActive: handbook.join_code_active
    });

  } catch (error) {
    console.error('Error in GET /api/handbook/join-code:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate a join code
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    const { handbookId } = await request.json();
    
    if (!handbookId) {
      return NextResponse.json(
        { success: false, message: "handbook_id krävs" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    
    // Check if user is admin of this handbook
    const { data: adminCheck, error: adminError } = await supabase
      .from("handbook_members")
      .select("id")
      .eq("handbook_id", handbookId)
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminError) {
      console.error('Fel vid kontroll av admin-behörighet:', adminError);
      return NextResponse.json(
        { success: false, message: 'Kunde inte verifiera admin-behörighet' },
        { status: 500 }
      );
    }

    if (!adminCheck) {
      return NextResponse.json(
        { success: false, message: 'Du har inte admin-behörighet för denna handbok' },
        { status: 403 }
      );
    }

    // Deactivate join code
    const { error } = await supabase
      .from('handbooks')
      .update({ 
        join_code_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', handbookId);

    if (error) {
      console.error('Error deactivating join code:', error);
      return NextResponse.json(
        { success: false, message: "Kunde inte inaktivera join-kod" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Join-kod inaktiverad"
    });

  } catch (error) {
    console.error('Error in DELETE /api/handbook/join-code:', error);
    return NextResponse.json(
      { success: false, message: "Internt serverfel" },
      { status: 500 }
    );
  }
} 