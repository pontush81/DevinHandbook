import { NextRequest, NextResponse } from 'next/server';
import { createDirectClient, testDirectConnection } from '@/lib/direct-db';
import { testDatabaseConnection } from '@/lib/supabase';

export const runtime = 'edge';
export const preferredRegion = ['arn1'];

export async function GET(request: NextRequest) {
  try {
    console.log("Testar direktanslutning till Supabase");
    const startTime = Date.now();
    
    // Testa både standard-anslutning och direktanslutning
    const standardResult = await testDatabaseConnection();
    const directResult = await testDirectConnection();
    
    const endTime = Date.now();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalDuration: endTime - startTime,
      environment: {
        runtime: typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node',
        vercelUrl: process.env.VERCEL_URL,
        vercelRegion: process.env.VERCEL_REGION,
        nodeEnv: process.env.NODE_ENV,
      },
      tests: {
        standard: standardResult,
        direct: directResult,
      },
      conclusion: {
        standardWorking: standardResult.connected,
        directWorking: directResult.connected,
        recommendation: directResult.connected 
          ? 'Använd direktanslutningen istället' 
          : 'Båda metoderna misslyckades'
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error("Fel vid test av direktanslutning:", error);
    
    return NextResponse.json({
      error: 'Ett fel uppstod vid test av direktanslutning',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  }
} 