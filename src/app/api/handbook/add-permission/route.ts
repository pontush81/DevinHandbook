import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { handbookId, email, role } = await request.json();
  if (!handbookId || !email || !role) {
    return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // 1. Hämta användarens ID för e-postadressen
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ success: false, message: 'Kunde inte hitta användare' }, { status: 404 });
  }

  // 2. Lägg till i handbook_permissions
  const { error: permError } = await supabase
    .from('handbook_permissions')
    .insert({
      handbook_id: handbookId,
      owner_id: user.id,
      role,
    });

  if (permError) {
    return NextResponse.json({ success: false, message: 'Kunde inte lägga till rättighet' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 