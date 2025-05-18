import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.url;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';
  
  try {
    const supabase = getServiceSupabase();
    
    // Test database connection
    let dbStatus = { connected: false, error: null };
    try {
      const { data, error } = await supabase
        .from('handbooks')
        .select('count')
        .limit(1);
      
      if (error) {
        dbStatus = { connected: false, error: error.message };
      } else {
        dbStatus = { connected: true, count: data[0]?.count || 0 };
      }
    } catch (error) {
      dbStatus = { connected: false, error: error.message };
    }
    
    // Check if ABC handbook exists
    let abcHandbook = null;
    if (dbStatus.connected) {
      try {
        const { data, error } = await supabase
          .from('handbooks')
          .select('id, title, subdomain, created_at')
          .eq('subdomain', 'abc')
          .single();
        
        if (!error) {
          abcHandbook = data;
        }
      } catch (error) {
        console.error('Error fetching ABC handbook:', error);
      }
    }
    
    // Check if sections exist for ABC handbook
    let sections = [];
    if (abcHandbook) {
      try {
        const { data, error } = await supabase
          .from('sections')
          .select('id, title, description, handbook_id')
          .eq('handbook_id', abcHandbook.id);
        
        if (!error && data) {
          sections = data;
        }
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    }
    
    // Check environment variables
    const envVars = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      vercelUrl: process.env.VERCEL_URL || null,
      nodeEnv: process.env.NODE_ENV || 'unknown',
    };
    
    // Create diagnostic data
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      environment: {
        isDevelopment,
        isEdgeRuntime,
        envVars,
        vercelUrl: process.env.VERCEL_URL,
        vercelEnv: process.env.VERCEL_ENV || 'unknown',
      },
      request: {
        hostname,
        url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
      },
      database: dbStatus,
      abcHandbook: abcHandbook,
      sections: sections,
    };
    
    return NextResponse.json(diagnosticData, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error',
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store'
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 