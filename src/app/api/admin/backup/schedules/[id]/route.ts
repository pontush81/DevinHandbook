import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/security-utils';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Standardiserad admin-autentisering
    const authResult = await adminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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
    // 1. Standardiserad admin-autentisering
    const authResult = await adminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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