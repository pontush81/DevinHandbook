import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const handbookId = searchParams.get('id');
  const userId = searchParams.get('userId');
  
  if (!handbookId && !userId) {
    return NextResponse.json({ error: 'Missing id or userId parameter' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  
  try {
    let query = supabase
      .from('handbooks')
      .select('id, title, subdomain, owner_id, created_at, published');
    
    if (handbookId) {
      query = query.eq('id', handbookId);
    } else if (userId) {
      query = query.eq('owner_id', userId);
    }
    
    const { data: handbooks, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      handbooks: handbooks || [],
      count: handbooks?.length || 0,
      searchBy: handbookId ? 'id' : 'userId',
      searchValue: handbookId || userId
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 