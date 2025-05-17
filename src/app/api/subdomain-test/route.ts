import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'edge';

async function checkHandbookExists(subdomain: string) {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('handbooks')
      .select('id, name, subdomain')
      .eq('subdomain', subdomain)
      .single();
    
    if (error) {
      return { exists: false, error: error.message };
    }
    
    return { exists: true, handbook: data };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

export async function GET(request: NextRequest) {
  // Hämta hostname och subdomän
  const hostname = request.headers.get('host') || '';
  const url = request.url;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';
  
  // Extrahera subdomäner
  const handbookSubdomainMatch = hostname.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);
  const subdomain = handbookSubdomainMatch?.groups?.subdomain || null;
  
  // Testa databaskoppling
  let databaseStatus = { connected: false, error: null };
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('handbooks').select('count').limit(1);
    
    databaseStatus = error 
      ? { connected: false, error: error.message } 
      : { connected: true, error: null };
  } catch (error) {
    databaseStatus = { connected: false, error: error.message };
  }
  
  // Om en subdomän identifierades, kolla om handboken existerar
  let handbookInfo = null;
  if (subdomain && subdomain !== 'www' && subdomain !== 'test') {
    handbookInfo = await checkHandbookExists(subdomain);
  }
  
  // Testa miljövariabler
  const envVars = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercelUrl: process.env.VERCEL_URL || null,
    nodeEnv: process.env.NODE_ENV || 'unknown'
  };
  
  // Skapa diagnostikdata
  const diagnosticData = {
    status: databaseStatus.connected ? 'ok' : 'database_error',
    timestamp: new Date().toISOString(),
    request: {
      hostname,
      url,
      subdomain,
      isSubdomain: !!subdomain,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    },
    environment: {
      isDevelopment,
      isEdgeRuntime,
      envVars
    },
    database: databaseStatus,
    middleware: {
      rewrite: subdomain ? `/handbook/${subdomain}` : null
    },
    handbook: handbookInfo
  };
  
  // Returnera med CORS-headers
  return NextResponse.json(diagnosticData, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store'
    }
  });
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