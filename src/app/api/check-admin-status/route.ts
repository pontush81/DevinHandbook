import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * API-rutt för att kontrollera om inloggad användare är admin för en specifik handbok
 */
export async function GET(req: NextRequest) {
  try {
    // Hämta handbok_id från query-parametrar
    const { searchParams } = new URL(req.url);
    const handbookId = searchParams.get('handbook_id');

    if (!handbookId) {
      return NextResponse.json(
        { error: "handbok_id parameter krävs" },
        { status: 400 }
      );
    }
    
    // Hämta användarens session från cookies med ny SSR API
    const cookieStore = cookies();
    const supabase = createServerClient(
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
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[check-admin-status] Sessionsfel:', sessionError);
      return NextResponse.json(
        { error: "Användaren är inte inloggad", isAdmin: false },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Använd admin-klienten för att kringgå RLS-begränsningar
    const adminClient = getAdminClient();
    
    // Kontrollera medlemskap i handbok_members
    const { data, error } = await adminClient
      .from('handbook_members')
      .select('role')
      .eq('handbook_id', handbookId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[check-admin-status] Databasfel:', error);
      return NextResponse.json(
        { error: "Fel vid kontroll av adminstatus", isAdmin: false },
        { status: 500 }
      );
    }
    
    const isAdmin = data && data.role === 'admin';
    
    return NextResponse.json({
      isAdmin,
      userId,
      handbookId
    });
    
  } catch (error) {
    console.error('[check-admin-status] Oväntat fel:', error);
    return NextResponse.json(
      { error: "Ett oväntat fel inträffade", isAdmin: false },
      { status: 500 }
    );
  }
}

// För att undvika CORS-problem vid lokalt testande
export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    } 
  });
} 