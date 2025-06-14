import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'id krävs' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ocr_jobs')
    .select('id, status, result, error_message, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    result: data.result,
    error_message: data.error_message,
    updated_at: data.updated_at,
  });
} 