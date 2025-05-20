import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  const { handbookId, userId, role } = await request.json();
  if (!handbookId || !userId || !role) {
    return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('handbook_permissions')
    .update({ role })
    .eq('handbook_id', handbookId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ success: false, message: 'Kunde inte uppdatera roll' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 