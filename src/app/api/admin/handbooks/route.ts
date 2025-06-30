import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getHybridAuth } from '@/lib/standard-auth';
import { checkIsSuperAdmin } from '@/lib/user-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Autentisera användaren
    const authResult = await getHybridAuth(request);
    if (!authResult.userId) {
      return NextResponse.json(
        { success: false, message: "Ej autentiserad" },
        { status: 401 }
      );
    }

    // 2. Kontrollera superadmin-behörighet
    const supabase = getServiceSupabase();
    const isSuperAdmin = await checkIsSuperAdmin(
      supabase,
      authResult.userId,
      authResult.userEmail || ''
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Du har inte superadmin-behörighet" },
        { status: 403 }
      );
    }

    // 3. Hämta handböcker (nu säkert)
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