import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results = {
    environment: process.env.NODE_ENV,
    diagnostics: [],
    time: new Date().toISOString(),
    success: false
  };
  
  try {
    // Kontrollera miljövariabler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    results.diagnostics.push({
      check: 'Miljövariabler',
      hasUrl: Boolean(supabaseUrl),
      urlFormat: supabaseUrl ? (supabaseUrl.startsWith('https://') ? 'OK' : 'Saknar HTTPS') : 'Saknas',
      hasAnonKey: Boolean(supabaseAnonKey),
      hasServiceKey: Boolean(supabaseServiceKey)
    });
    
    // Testa nätverksanslutning till Supabase
    if (supabaseUrl) {
      try {
        const pingStart = Date.now();
        const pingResponse = await fetch(supabaseUrl);
        const pingTime = Date.now() - pingStart;
        
        results.diagnostics.push({
          check: 'Nätverksanslutning',
          status: pingResponse.status,
          pingMs: pingTime,
          ok: pingResponse.ok
        });
      } catch (networkError) {
        results.diagnostics.push({
          check: 'Nätverksanslutning',
          error: networkError.message,
          ok: false
        });
      }
    }
    
    // Testa Supabase-klient med anon key
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false }
        });
        
        const { data: healthData, error: healthError } = await anonClient.from('handbooks').select('id').limit(1);
        
        results.diagnostics.push({
          check: 'Anon-klient',
          success: !healthError,
          error: healthError ? healthError.message : null,
          data: healthData ? { count: healthData.length } : null
        });
      } catch (anonError) {
        results.diagnostics.push({
          check: 'Anon-klient',
          success: false,
          error: anonError.message
        });
      }
    }
    
    // Testa Supabase-klient med service role key
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false }
        });
        
        const { data: roleData, error: roleError } = await serviceClient.from('handbooks').select('id').limit(1);
        
        results.diagnostics.push({
          check: 'Service-roll-klient',
          success: !roleError,
          error: roleError ? roleError.message : null,
          data: roleData ? { count: roleData.length } : null
        });
      } catch (serviceError) {
        results.diagnostics.push({
          check: 'Service-roll-klient',
          success: false,
          error: serviceError.message
        });
      }
    }
    
    // Om alla tester lyckades
    results.success = results.diagnostics.every(d => d.success !== false && d.ok !== false);
    
    return NextResponse.json(results);
  } catch (error) {
    results.diagnostics.push({
      check: 'Huvuddiagnos',
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : null
    });
    
    return NextResponse.json(results, { status: 500 });
  }
} 