import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  const { handbookId, userId } = await request.json();
  if (!handbookId || !userId) {
    return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('handbook_permissions')
    .delete()
    .eq('handbook_id', handbookId)
    .eq('owner_id', userId);

  if (error) {
    return NextResponse.json({ success: false, message: 'Kunde inte ta bort rättighet' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 