import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, file_path } = body;

    if (!file_path) {
      return NextResponse.json({ error: 'file_path krävs' }, { status: 400 });
    }

    const job = {
      id: uuidv4(),
      user_id: user_id || null,
      file_path,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('ocr_jobs').insert([job]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ job_id: job.id, status: 'pending' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Något gick fel' }, { status: 500 });
  }
} 