import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const supabase = getServiceSupabase();

    // Get recent webhook processing logs
    const { data: logs, error } = await supabase
      .from('webhook_processing_logs')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching webhook logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      count: logs?.length || 0
    });

  } catch (error) {
    console.error('Error in webhook logs endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 