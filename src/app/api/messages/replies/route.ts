import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { getServerSession } from '@/lib/auth';

// Local server session function
async function getServerSession() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error in getServerSession:', error);
    return null;
  }
}

async function sendNotification(type: 'new_topic' | 'new_reply', data: any) {
  try {
    const notificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`;
    
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error('Failed to send notification:', await response.text());
    } else {
      console.log('Notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// GET /api/messages/replies?topic_id=xxx&show_all=true - Fetch replies for a topic
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att läsa svar' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const topicId = url.searchParams.get('topic_id');
    const showAll = url.searchParams.get('show_all') === 'true';

    if (!topicId) {
      return NextResponse.json(
        { error: 'topic_id är obligatorisk' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 2. Verify user has access to the handbook containing this topic
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select('handbook_id')
      .eq('id', topicId)
      .single();

    if (topicError || !topic) {
      return NextResponse.json(
        { error: 'Meddelandet hittades inte' },
        { status: 404 }
      );
    }

    // Check user access to the handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', topic.handbook_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att läsa detta meddelande' },
        { status: 403 }
      );
    }

    // 3. Count total replies for this topic
    const { count } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topicId)
      .neq('id', topicId)
      .eq('is_published', true);

    const totalCount = count || 0;
    const showingRecent = totalCount > 5 && !showAll;

    // 4. Fetch replies for the topic
    let query = supabase
      .from('forum_posts')
      .select(`
        id,
        content,
        author_name,
        author_id,
        created_at,
        reply_to_post_id
      `)
      .eq('topic_id', topicId)
      .neq('id', topicId) // Exclude the original topic post
      .eq('is_published', true)
      .order('created_at', { ascending: true }); // Chronological order

    // Limit to 5 most recent if not showing all
    if (!showAll && totalCount > 5) {
      // Get the 5 most recent by using a subquery approach
      const { data: recentIds } = await supabase
        .from('forum_posts')
        .select('id')
        .eq('topic_id', topicId)
        .neq('id', topicId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentIds && recentIds.length > 0) {
        const ids = recentIds.map(r => r.id);
        query = query.in('id', ids);
      }
    }

    const { data: replies, error } = await query;

    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json(
        { error: 'Kunde inte hämta svar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      replies: replies || [],
      total_count: totalCount,
      showing_recent: showingRecent
    });
  } catch (error) {
    console.error('Error in GET /api/messages/replies:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

// POST /api/messages/replies - Create a new reply
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att svara' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { topic_id, content, author_name } = body;

    // 2. Validate required fields
    if (!topic_id || !content || !author_name) {
      return NextResponse.json(
        { error: 'Alla fält är obligatoriska' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 3. Verify user has access to the handbook containing this topic
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select('handbook_id, is_locked, reply_count, title')
      .eq('id', topic_id)
      .single();

    if (topicError || !topic) {
      return NextResponse.json(
        { error: 'Meddelandet hittades inte' },
        { status: 404 }
      );
    }

    if (topic.is_locked) {
      return NextResponse.json(
        { error: 'Detta meddelande är låst för nya svar' },
        { status: 403 }
      );
    }

    // Check user access to the handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', topic.handbook_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att svara på detta meddelande' },
        { status: 403 }
      );
    }

    // 4. Create the reply
    const { data: reply, error: replyError } = await supabase
      .from('forum_posts')
      .insert({
        topic_id,
        handbook_id: topic.handbook_id,
        content: content.trim(),
        author_id: session.user.id,
        author_name: author_name.trim(),
        author_email: session.user.email,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (replyError) {
      console.error('Error creating reply:', replyError);
      return NextResponse.json(
        { error: 'Kunde inte skapa svaret' },
        { status: 500 }
      );
    }

    // 5. Update topic reply count using direct calculation
    const newReplyCount = (topic.reply_count || 0) + 1;
    const { error: updateError } = await supabase
      .from('forum_topics')
      .update({ 
        reply_count: newReplyCount,
        last_reply_at: new Date().toISOString()
      })
      .eq('id', topic_id);

    if (updateError) {
      console.error('Error updating topic reply count:', updateError);
      // Don't fail the whole operation for this
    }

    // 6. Send notification asynchronously (don't block the response)
    setImmediate(() => {
      sendNotification('new_reply', {
        type: 'new_reply',
        handbook_id: topic.handbook_id,
        topic_id: topic_id,
        post_id: reply.id,
        author_name: author_name.trim(),
        content_preview: content.trim()
      });
    });

    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        content: reply.content,
        author_name: reply.author_name,
        created_at: reply.created_at
      }
    });
  } catch (error) {
    console.error('Error in POST /api/messages/replies:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/replies?reply_id=xxx - Delete a specific reply
export async function DELETE(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att radera svar' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const replyId = url.searchParams.get('reply_id');

    if (!replyId) {
      return NextResponse.json(
        { error: 'reply_id krävs' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 2. Get the reply with its topic to check access and ownership
    const { data: replyData, error: replyError } = await supabase
      .from('forum_posts')
      .select(`
        id,
        author_id,
        topic_id,
        forum_topics!inner(handbook_id)
      `)
      .eq('id', replyId)
      .single();

    if (replyError || !replyData) {
      return NextResponse.json(
        { error: 'Svaret hittades inte' },
        { status: 404 }
      );
    }

    // 3. Check user has access to the handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id, role')
      .eq('handbook_id', replyData.forum_topics.handbook_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att komma åt denna handbok' },
        { status: 403 }
      );
    }

    // 4. Check if user is author or admin
    const isAuthor = replyData.author_id === session.user.id;
    const isAdmin = memberData.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Du kan bara radera dina egna svar eller vara admin' },
        { status: 403 }
      );
    }

    // 5. Delete the reply
    const { error: deleteError } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', replyId);

    if (deleteError) {
      console.error('Error deleting reply:', deleteError);
      return NextResponse.json(
        { error: 'Kunde inte radera svaret' },
        { status: 500 }
      );
    }

    // 6. Update the reply count on the topic
    const { data: topicData, error: topicError } = await supabase
      .from('forum_topics')
      .select('reply_count')
      .eq('id', replyData.topic_id)
      .single();

    if (!topicError && topicData) {
      const newReplyCount = Math.max(0, (topicData.reply_count || 1) - 1);
      
      await supabase
        .from('forum_topics')
        .update({ reply_count: newReplyCount })
        .eq('id', replyData.topic_id);
    }

    return NextResponse.json({ 
      message: 'Svaret har raderats',
      topic_id: replyData.topic_id 
    });

  } catch (error) {
    console.error('Error in DELETE /api/messages/replies:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 