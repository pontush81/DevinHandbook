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
  console.log('🔔 PUT /api/notifications/preferences started');
  
  try {
    const session = await getServerSession();
    console.log('📝 Session check:', { hasSession: !!session, userId: session?.user?.id });
    
    if (!session?.user) {
      console.log('❌ No valid session found');
      return NextResponse.json(
        { error: 'Du måste vara inloggad' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📦 Request body:', body);
    
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
      console.log('❌ Missing handbook_id');
      return NextResponse.json(
        { error: 'handbook_id är obligatorisk' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    console.log('🔗 Supabase client created');

    // Verify user has access to this handbook
    console.log('🔍 Checking handbook access for:', { handbookId: handbook_id, userId: session.user.id });
    
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbook_id)
      .eq('user_id', session.user.id)
      .single();

    console.log('👥 Member check result:', { memberData, memberError });

    if (memberError || !memberData) {
      console.log('❌ Access denied - user not member of handbook');
      return NextResponse.json(
        { error: 'Du har inte behörighet till denna handbok' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData = {
      user_id: session.user.id,
      handbook_id: handbook_id,
      email_new_topics: email_new_topics ?? true,
      email_new_replies: email_new_replies ?? true,
      email_mentions: email_mentions ?? false,
      app_new_topics: app_new_topics ?? false,
      app_new_replies: app_new_replies ?? false,
      app_mentions: app_mentions ?? false,
      updated_at: new Date().toISOString()
    };

    console.log('💾 Updating preferences with data:', updateData);

    // Update notification preferences
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_notification_preferences')
      .upsert(updateData, { 
        onConflict: 'user_id,handbook_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    console.log('📊 Update result:', { updatedPreferences, updateError });

    if (updateError) {
      console.error('❌ Error updating preferences:', updateError);
      return NextResponse.json(
        { error: 'Kunde inte uppdatera notifikationsinställningar', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Preferences updated successfully');
    
    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('💥 Unexpected error in PUT /api/notifications/preferences:', error);
    return NextResponse.json(
      { error: 'Internt serverfel', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 