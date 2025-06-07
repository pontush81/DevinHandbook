import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

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

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att skriva meddelanden' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, author_name, category_id, handbook_id } = body;

    // 2. Validate required fields
    if (!title || !content || !author_name || !category_id || !handbook_id) {
      return NextResponse.json(
        { error: 'Alla fält är obligatoriska' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 3. Check user has access to the handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('id')
      .eq('handbook_id', handbook_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att skriva meddelanden i denna handbok' },
        { status: 403 }
      );
    }

    // 4. Verify category belongs to the handbook
    const { data: category, error: categoryError } = await supabase
      .from('forum_categories')
      .select('id')
      .eq('id', category_id)
      .eq('handbook_id', handbook_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Ogiltig kategori' },
        { status: 400 }
      );
    }

    // 5. Create the topic
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .insert({
        handbook_id,
        category_id,
        title: title.trim(),
        content: content.trim(),
        author_id: session.user.id,
        author_name: author_name.trim(),
        author_email: session.user.email,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (topicError) {
      console.error('Error creating topic:', topicError);
      return NextResponse.json(
        { error: 'Kunde inte skapa meddelandet' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      topic: {
        id: topic.id,
        title: topic.title,
        content: topic.content,
        author_name: topic.author_name,
        created_at: topic.created_at
      }
    });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att radera meddelanden' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const messageId = url.searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Meddelande-ID är obligatoriskt' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 2. Get the message and check permissions
    const { data: message, error: messageError } = await supabase
      .from('forum_topics')
      .select('id, author_id, handbook_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Meddelandet hittades inte' },
        { status: 404 }
      );
    }

    // 3. Check if user has permission to delete (author or admin)
    const isAuthor = message.author_id === session.user.id;
    
    // Check if user is admin of the handbook
    const { data: memberData, error: memberError } = await supabase
      .from('handbook_members')
      .select('role')
      .eq('handbook_id', message.handbook_id)
      .eq('user_id', session.user.id)
      .single();

    const isAdmin = memberData?.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Du har inte behörighet att radera detta meddelande' },
        { status: 403 }
      );
    }

    // 4. Delete all replies first (cascade)
    const { error: repliesError } = await supabase
      .from('forum_posts')
      .delete()
      .eq('topic_id', messageId);

    if (repliesError) {
      console.error('Error deleting replies:', repliesError);
      return NextResponse.json(
        { error: 'Kunde inte radera svaren' },
        { status: 500 }
      );
    }

    // 5. Delete the topic
    const { error: topicError } = await supabase
      .from('forum_topics')
      .delete()
      .eq('id', messageId);

    if (topicError) {
      console.error('Error deleting topic:', topicError);
      return NextResponse.json(
        { error: 'Kunde inte radera meddelandet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meddelandet har raderats'
    });
  } catch (error) {
    console.error('Error in DELETE /api/messages:', error);
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    );
  }
} 