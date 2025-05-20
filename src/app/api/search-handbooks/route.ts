import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const { data, error } = await supabase
    .from('handbooks')
    .select('id, title, subdomain')
    .or(`title.ilike.%${q}%,subdomain.ilike.%${q}%`)
    .eq('published', true)
    .order('title')
    .limit(10);
  if (error) {
    console.error('[search-handbooks] Supabase error:', error);
    console.error('[search-handbooks] Query param q:', q);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json(
    { results: data },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
} 