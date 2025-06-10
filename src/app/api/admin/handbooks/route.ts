import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Använd samma approach som users API - hämta direkt med service supabase
    const supabase = getServiceSupabase();

    // Hämta alla handböcker med de kolumner som faktiskt finns
    const { data: handbooks, error: handbooksError } = await supabase
      .from('handbooks')
      .select('id, title, slug, created_at, published, owner_id, organization_name')
      .order('created_at', { ascending: false });

    if (handbooksError) {
      console.error('Error fetching handbooks:', handbooksError);
      return NextResponse.json(
        { success: false, message: "Kunde inte hämta handböcker" },
        { status: 500 }
      );
    }

    const processedHandbooks = handbooks?.map(handbook => ({
      id: handbook.id,
      title: handbook.title || 'Namnlös handbok',
      slug: handbook.slug,
      created_at: handbook.created_at,
      published: handbook.published,
      owner_id: handbook.owner_id,
      organization_name: handbook.organization_name
    })) || [];

    return NextResponse.json({ 
      success: true,
      data: processedHandbooks 
    });
  } catch (error: unknown) {
    console.error('Error in handbooks API:', error);
    return NextResponse.json(
      { success: false, message: 'Ett oväntat fel inträffade' },
      { status: 500 }
    );
  }
} 