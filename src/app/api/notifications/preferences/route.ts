import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const handbookId = url.searchParams.get('handbook_id');

    if (!handbookId) {
      return NextResponse.json(
        { error: 'handbook_id är obligatorisk' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify user has access to this handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbookId)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Du har inte behörighet till denna handbok' },
        { status: 403 }
      );
    }

    // Get notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('handbook_id', handbookId)
      .single();

    // If no preferences exist, create default ones
    if (prefError && prefError.code === 'PGRST116') {
      const { data: newPreferences, error: createError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: session.user.id,
          handbook_id: handbookId,
          email_new_topics: true,
          email_new_replies: true,
          email_mentions: true,
          app_new_topics: true,
          app_new_replies: true,
          app_mentions: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating default preferences:', createError);
        return NextResponse.json(
          { error: 'Kunde inte skapa notifikationsinställningar' },
          { status: 500 }
        );
      }

      return NextResponse.json({ preferences: newPreferences });
    }

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      return NextResponse.json(
        { error: 'Kunde inte hämta notifikationsinställningar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error in GET /api/notifications/preferences:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      handbook_id,
      email_new_topics,
      email_new_replies,
      email_mentions,
      app_new_topics,
      app_new_replies,
      app_mentions
    } = body;

    if (!handbook_id) {
      return NextResponse.json(
        { error: 'handbook_id är obligatorisk' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify user has access to this handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbook_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Du har inte behörighet till denna handbok' },
        { status: 403 }
      );
    }

    // Update notification preferences
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: session.user.id,
        handbook_id: handbook_id,
        email_new_topics: email_new_topics ?? true,
        email_new_replies: email_new_replies ?? true,
        email_mentions: email_mentions ?? true,
        app_new_topics: app_new_topics ?? true,
        app_new_replies: app_new_replies ?? true,
        app_mentions: app_mentions ?? true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json(
        { error: 'Kunde inte uppdatera notifikationsinställningar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Error in PUT /api/notifications/preferences:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 