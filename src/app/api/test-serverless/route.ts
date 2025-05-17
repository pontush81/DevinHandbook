import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// VIKTIGT: Ingen runtime-specifikation - detta blir en serverless-funktion, inte en edge-funktion

// Enkel testfunktion för direkt anslutning i serverless-miljö
async function testServerlessConnection() {
  try {
    // Hämta konfiguration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        connected: false,
        error: 'Saknar Supabase-konfiguration',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey
        }
      };
    }
    
    console.log('Skapar serverless Supabase-klient för:', supabaseUrl);
    
    // Skapa klient
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Testa anslutningen
    const startTime = Date.now();
    const { data, error } = await client
      .from('handbooks')
      .select('count')
      .limit(1);
    
    const endTime = Date.now();
    
    if (error) {
      return {
        connected: false,
        error: error.message,
        errorCode: error.code,
        details: error.details,
        timing: endTime - startTime
      };
    }
    
    return {
      connected: true,
      data,
      timing: endTime - startTime
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      details: error.cause ? String(error.cause) : 'Unknown',
      stack: error.stack ? error.stack.split('\n')[0] : null
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Testar serverless-anslutning till Supabase...');
    
    // Testa anslutningen
    const result = await testServerlessConnection();
    
    // Samla information om miljön
    const environment = {
      isEdgeRuntime: typeof EdgeRuntime !== 'undefined',
      isServerless: typeof EdgeRuntime === 'undefined',
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15) + '...' 
        : 'saknas',
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      vercelUrl: process.env.VERCEL_URL || 'unknown'
    };
    
    // Returnera resultatet
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      runtime: 'serverless',
      environment,
      connection: result
    }, {
      status: result.connected ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Serverless-testfel:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Fel vid serverless-test',
      message: error.message,
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 