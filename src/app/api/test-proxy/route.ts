import { NextRequest, NextResponse } from 'next/server';
import { testProxyConnection } from '@/lib/proxy-db';
import { testDatabaseConnection } from '@/lib/supabase';
import { testDirectConnection } from '@/lib/direct-db';

export const runtime = 'edge';
export const preferredRegion = ['arn1'];

export async function GET(request: NextRequest) {
  try {
    console.log("Testar ALLA anslutningsmetoder till Supabase");
    const startTime = Date.now();
    
    // Testa alla tre anslutningsmetoder
    const standardResult = await testDatabaseConnection();
    const directResult = await testDirectConnection();
    const proxyResult = await testProxyConnection();
    
    const endTime = Date.now();
    
    // Avgör vilken metod som fungerar bäst
    let workingMethod = 'none';
    if (standardResult.connected) workingMethod = 'standard';
    else if (directResult.connected) workingMethod = 'direct';
    else if (proxyResult.connected) workingMethod = 'proxy';
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalDuration: endTime - startTime,
      environment: {
        runtime: typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node',
        vercelUrl: process.env.VERCEL_URL,
        vercelRegion: process.env.VERCEL_REGION,
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15) + '...'
          : 'missing',
      },
      tests: {
        standard: standardResult,
        direct: directResult,
        proxy: proxyResult
      },
      conclusion: {
        workingMethod,
        recommendation: workingMethod !== 'none'
          ? `Använd ${workingMethod}-metoden`
          : 'Ingen metod fungerar - kontakta Supabase support'
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error("Fel vid test av anslutningar:", error);
    
    return NextResponse.json({
      error: 'Ett fel uppstod vid test av anslutningar',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Hantera OPTIONS-anrop för CORS
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