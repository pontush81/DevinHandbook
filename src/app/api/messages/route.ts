import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, author_name, category_id, handbook_id } = body;

    // Validate required fields
    if (!title || !content || !author_name || !category_id || !handbook_id) {
      return NextResponse.json(
        { error: 'Alla fält är obligatoriska' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = getServiceSupabase();

    // Verify handbook exists and forum is enabled
    const { data: handbook, error: handbookError } = await supabase
      .from('handbooks')
      .select('id, forum_enabled')
      .eq('id', handbook_id)
      .single();

    if (handbookError || !handbook || !handbook.forum_enabled) {
      return NextResponse.json(
        { error: 'Handbok hittades inte eller meddelanden är inte aktiverat' },
        { status: 404 }
      );
    }

    // Verify category exists and belongs to this handbook
    const { data: category, error: categoryError } = await supabase
      .from('forum_categories')
      .select('id')
      .eq('id', category_id)
      .eq('handbook_id', handbook_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Kategorin hittades inte' },
        { status: 404 }
      );
    }

    // Create the message
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .insert({
        title: title.trim(),
        content: content.trim(),
        author_name: author_name.trim(),
        author_id: null,
        category_id,
        handbook_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (topicError) {
      console.error('Error creating topic:', topicError);
      console.error('Insert data was:', {
        title: title.trim(),
        content: content.trim(),
        author_name: author_name.trim(),
        author_id: null,
        category_id,
        handbook_id
      });
      return NextResponse.json(
        { error: 'Kunde inte skapa meddelandet', details: topicError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, topic });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Serverfel' },
      { status: 500 }
    );
  }
} 