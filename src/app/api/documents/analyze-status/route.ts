import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId krävs' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('analyze_jobs')
    .select('id, status, result, error_message, updated_at')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Kunde inte hitta analyze-jobb', details: error?.message }, { status: 404 });
  }

  return NextResponse.json({
    jobId: data.id,
    status: data.status,
    result: data.result,
    errorMessage: data.error_message,
    updatedAt: data.updated_at,
  });
} 