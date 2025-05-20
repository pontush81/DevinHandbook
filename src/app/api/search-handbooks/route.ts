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
    .select('id, name, subdomain')
    .ilike('name', `%${q}%`)
    .or(`subdomain.ilike.%${q}%`)
    .eq('published', true)
    .order('name')
    .limit(10);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ results: data });
} 