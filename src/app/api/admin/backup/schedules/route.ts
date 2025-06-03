import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET - List all backup schedules
export async function GET(request: NextRequest) {
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

    // Get all backup schedules
    const { data: schedules, error } = await supabase
      .from('backup_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching backup schedules:', error);
      return NextResponse.json({ error: 'Failed to fetch backup schedules' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedules
    });

  } catch (error) {
    console.error('Error in backup schedules route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new backup schedule
export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json();
    const { frequency, time, email } = body;

    // Validate input
    if (!frequency || !time || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    // Create new backup schedule
    const { data: schedule, error } = await supabase
      .from('backup_schedules')
      .insert({
        frequency,
        time,
        email,
        enabled: true,
        next_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Set next run to tomorrow
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating backup schedule:', error);
      return NextResponse.json({ error: 'Failed to create backup schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedule
    });

  } catch (error) {
    console.error('Error in backup schedules route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 