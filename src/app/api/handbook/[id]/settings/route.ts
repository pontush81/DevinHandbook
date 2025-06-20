import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, getUserRole } from '@/lib/auth-utils';
import { getServiceSupabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { forum_enabled } = body;

    // Check if user is admin of this handbook
    const userRole = await getUserRole(session.user.id, id);
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Du måste vara admin för att ändra handboksinställningar' },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabase();

    // Update handbook settings
    const { data: updatedHandbook, error: updateError } = await supabase
      .from('handbooks')
      .update({
        forum_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating handbook settings:', updateError);
      return NextResponse.json(
        { error: 'Kunde inte uppdatera handboksinställningar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      handbook: updatedHandbook
    });

  } catch (error) {
    console.error('Error in handbook settings API:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 