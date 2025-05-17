import { NextRequest, NextResponse } from 'next/server';

// Denna route är inte specificerad som edge runtime eftersom vi vill testa i serverless-miljö
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Hämta Supabase-URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return NextResponse.json({ 
        error: 'Supabase URL saknas', 
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }
    
    const baseUrl = supabaseUrl.startsWith('http') 
      ? supabaseUrl 
      : `https://${supabaseUrl}`;
    
    // Lista över endpoints att testa
    const endpoints = [
      // Auth endpoint
      { url: `${baseUrl}/auth/v1/health`, name: 'Auth Health' },
      // REST API endpoint 
      { url: `${baseUrl}/rest/v1/`, name: 'REST API' },
      // Storage endpoint
      { url: `${baseUrl}/storage/v1/health`, name: 'Storage Health' },
    ];
    
    // Utföra tester på alla endpoints
    const results = await Promise.all(endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        return {
          name: endpoint.name,
          url: endpoint.url,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          // Header-info kan vara användbar för felsökning
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        return {
          name: endpoint.name,
          url: endpoint.url,
          success: false,
          error: error.message,
          errorType: error.name
        };
      }
    }));
    
    const endTime = Date.now();
    
    // Analysera resultaten
    const allSuccessful = results.every(result => result.success);
    const anyPaused = results.some(result => 
      result.status === 503 || 
      (result.headers && result.headers['x-project-status'] === 'paused')
    );
    
    // Skapa en sammanfattningsstatusobjekt
    const status = {
      available: allSuccessful,
      paused: anyPaused,
      allEndpoints: results.length,
      successfulEndpoints: results.filter(result => result.success).length,
      projectStatus: anyPaused ? 'PAUSED' : allSuccessful ? 'ACTIVE' : 'UNAVAILABLE'
    };
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      supabaseUrl: baseUrl,
      status,
      endpointResults: results,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Fel vid kontroll av Supabase-status:', error);
    
    return NextResponse.json({
      error: 'Kunde inte kontrollera Supabase-status',
      message: error.message,
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 