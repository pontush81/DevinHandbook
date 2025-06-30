import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { adminAuth } from '@/lib/security-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Standardiserad admin-autentisering
    const authResult = await adminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    // 2. Hämta handböcker (nu säkert)
    const supabase = getServiceSupabase();
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