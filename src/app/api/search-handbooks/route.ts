import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
  
  console.log('Söker efter handböcker med:', q);
  
  try {
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
      return NextResponse.json(
        { error: error.message, details: error }, 
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }
    
    const results = Array.isArray(data) ? data : [];
    console.log('Hittade resultat:', results.length);
    
    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err) {
    console.error('[search-handbooks] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod vid sökning', details: err },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
} 