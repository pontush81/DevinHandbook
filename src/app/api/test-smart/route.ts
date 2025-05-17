import { NextRequest, NextResponse } from 'next/server';
import { getSmartClient } from '@/lib/smart-supabase-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const table = searchParams.get('table') || 'handbooks';
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    
    console.log(`Testar smart klient med tabell: ${table}, limit: ${limit}`);
    
    // Skapa smart klient
    const smartClient = getSmartClient();
    
    // Testa båda anslutningarna först för att få en status
    const testResults = await smartClient.testConnections();
    
    // Utför en riktig query med den smarta klienten
    const { data, error, source } = await smartClient.select(table, { limit });
    
    // Returnera resultatet med detaljer om vilken anslutningsmetod som användes
    return NextResponse.json({
      success: !error,
      connection_test: testResults,
      method_used: source,
      data,
      error,
      timestamp: new Date().toISOString()
    }, {
      status: error ? 500 : 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Smart klient test fel:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ett okänt fel inträffade',
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
} 