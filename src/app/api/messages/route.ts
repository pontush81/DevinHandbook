import { NextRequest, NextResponse } from 'next/server';
import { getHybridAuth, hasHandbookAccess, isHandbookAdmin, AUTH_RESPONSES } from '@/lib/standard-auth';
import { getServiceSupabase } from '@/lib/supabase';

async function sendNotification(type: 'new_topic' | 'new_reply', data: any) {
  try {
    // Add debugging
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = `Bearer ${serviceKey}`;
    
    console.log('[Messages] SendNotification debug:', {
      hasServiceKey: !!serviceKey,
      serviceKeyLength: serviceKey?.length || 0,
      authHeaderLength: authHeader.length,
      authHeaderPreview: authHeader.substring(0, 20) + '...'
    });

    // Anropa notifikations-API:et direkt utan webhook-autentisering
    const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`;
    console.log('[Messages] Calling notification URL:', notificationUrl);
    
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // Service key för intern auth
        'x-webhook-auth': process.env.WEBHOOK_SECRET || 'dev-secret'
      },
      body: JSON.stringify({
        type,
        data,
        source: 'messages-api'
      })
    });

    const result = await response.json();
    console.log('[Messages] Notification response:', {
      status: response.status,
      ok: response.ok,
      result
    });

    if (!response.ok) {
      console.error('[Messages] Notification failed:', result);
    }
  } catch (error) {
    console.error('[Messages] Notification error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Messages API] Starting message creation...');
    
    // Use hybrid authentication (supports cookies, query params, Bearer tokens)
    const { userId, session, authMethod } = await getHybridAuth(request);
    
    console.log('🔍 [Messages API] Auth result:', {
      hasUserId: !!userId,
      hasSession: !!session,
      authMethod,
      userId: userId || 'none'
    });

    if (!userId) {
      console.log('❌ [Messages API] No valid authentication found');
      return NextResponse.json(
        AUTH_RESPONSES.UNAUTHENTICATED,
        { status: AUTH_RESPONSES.UNAUTHENTICATED.status }
      );
    }

    const body = await request.json();
    const { title, content, category_id, handbook_id, author_name } = body;

    console.log('🔍 [Messages API] Request data:', {
      title: title?.substring(0, 50) + '...',
      content: content?.substring(0, 100) + '...',
      category_id,
      handbook_id,
      author_name,
      user_id: userId
    });

    // Validation
    if (!title || !content || !category_id || !handbook_id) {
      return NextResponse.json(
        { error: 'Alla fält är obligatoriska (title, content, category_id, handbook_id)' },
        { status: 400 }
      );
    }

    // Check handbook access
    const hasAccess = await hasHandbookAccess(userId, handbook_id);
    if (!hasAccess) {
      console.log('❌ [Messages API] User lacks handbook access');
      return NextResponse.json(
        AUTH_RESPONSES.HANDBOOK_ACCESS_DENIED,
        { status: AUTH_RESPONSES.HANDBOOK_ACCESS_DENIED.status }
      );
    }

    const supabase = getServiceSupabase();

    // Create the topic
    const { data: topicData, error: topicError } = await supabase
      .from('forum_topics')
      .insert({
        title,
        content,
        author_id: userId,
        author_name: author_name || 'Anonym',
        author_email: session?.user?.email || '',
        category_id,
        handbook_id,
        reply_count: 0
      })
      .select()
      .single();

    if (topicError || !topicData) {
      console.error('❌ [Messages API] Database error:', topicError);
      return NextResponse.json(
        { error: 'Kunde inte skapa meddelandet. Försök igen.' },
        { status: 500 }
      );
    }

    console.log('✅ [Messages API] Topic created successfully:', topicData.id);

    // Send notification asynchronously
    sendNotification('new_topic', {
      handbook_id,
      topic_id: topicData.id,
      author_name: author_name || 'Anonym',
      title,
      content_preview: content.substring(0, 200)
    }).catch(error => {
      console.error('[Messages API] Notification failed:', error);
    });

    return NextResponse.json({
      success: true,
      topic: topicData,
      message: 'Meddelandet skapades framgångsrikt!'
    });

  } catch (error) {
    console.error('❌ [Messages API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ett oväntat fel inträffade. Försök igen.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 [Messages API] Starting message deletion...');
    
    // Use hybrid authentication
    const { userId, authMethod } = await getHybridAuth(request);

    if (!userId) {
      return NextResponse.json(
        AUTH_RESPONSES.UNAUTHENTICATED,
        { status: AUTH_RESPONSES.UNAUTHENTICATED.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID är obligatorisk' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Get the message to check ownership and handbook access
    const { data: message, error: fetchError } = await supabase
      .from('forum_topics')
      .select('author_id, handbook_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Meddelandet hittades inte' },
        { status: 404 }
      );
    }

    // Check if user is the author or has admin access to the handbook
    const isAuthor = message.author_id === userId;
    const isAdmin = !isAuthor && await isHandbookAdmin(userId, message.handbook_id);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att radera detta meddelande' },
        { status: 403 }
      );
    }

    // Delete the message (cascade will handle replies)
    const { error: deleteError } = await supabase
      .from('forum_topics')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      console.error('❌ [Messages API] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Kunde inte radera meddelandet. Försök igen.' },
        { status: 500 }
      );
    }

    console.log('✅ [Messages API] Message deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Meddelandet raderades framgångsrikt!'
    });

  } catch (error) {
    console.error('❌ [Messages API] Delete error:', error);
    return NextResponse.json(
      { error: 'Ett oväntat fel inträffade. Försök igen.' },
      { status: 500 }
    );
  }
} 