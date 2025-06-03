import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check if superadmin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.is_superadmin) {
      return NextResponse.json({ error: 'Unauthorized - Superadmin required' }, { status: 403 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update the schedule
    const { data: schedule, error } = await supabase
      .from('backup_schedules')
      .update({ enabled })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating backup schedule:', error);
      return NextResponse.json({ error: 'Failed to update backup schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedule
    });

  } catch (error) {
    console.error('Error in backup schedule route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check if superadmin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.is_superadmin) {
      return NextResponse.json({ error: 'Unauthorized - Superadmin required' }, { status: 403 });
    }

    // Delete the schedule
    const { error: deleteError } = await supabase
      .from('backup_schedules')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting backup schedule:', deleteError);
      return NextResponse.json({ error: 'Failed to delete backup schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error in backup schedule route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 