import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/messages/replies?topic_id=xxx&show_all=true - Fetch replies for a topic
export async function GET(request: NextRequest) {
  try {
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

    // First get the original topic to exclude it from replies
    const { data: originalTopic } = await supabase
      .from('forum_topics')
      .select('id')
      .eq('id', topicId)
      .single();

    if (!originalTopic) {
      return NextResponse.json(
        { error: 'Meddelandet hittades inte' },
        { status: 404 }
      );
    }

    // Count total replies for this topic
    const { count } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topicId)
      .neq('id', topicId)
      .eq('is_published', true);

    const totalCount = count || 0;
    const showingRecent = totalCount > 5 && !showAll;

    // Fetch replies for the topic
    let query = supabase
      .from('forum_posts')
      .select(`
        id,
        content,
        author_name,
        created_at,
        reply_to_post_id
      `)
      .eq('topic_id', topicId)
      .neq('id', topicId) // Exclude the original topic post
      .eq('is_published', true)
      .order('created_at', { ascending: true }); // Chronological order

    // Limit to 5 most recent if not showing all
    if (!showAll && totalCount > 5) {
      query = query.limit(5);
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
    const body = await request.json();
    const { topic_id, content, author_name } = body;

    // Validate required fields
    if (!topic_id || !content || !author_name) {
      return NextResponse.json(
        { error: 'Alla fält är obligatoriska' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify topic exists and get handbook_id
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select('id, handbook_id, is_locked')
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
        { error: 'Detta meddelande är låst för svar' },
        { status: 403 }
      );
    }

    // Create the reply
    const { data: reply, error: replyError } = await supabase
      .from('forum_posts')
      .insert({
        topic_id,
        handbook_id: topic.handbook_id,
        content: content.trim(),
        author_name: author_name.trim(),
        author_id: null, // Since we don't have user auth, set to null
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