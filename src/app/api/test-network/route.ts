import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Saknar Supabase URL',
        time: new Date().toISOString()
      });
    }
    
    console.log(`Testar nätverksanslutning till: ${supabaseUrl}`);
    const startTime = Date.now();
    
    // Försöker göra ett enkelt ping mot Supabase
    const response = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Anslutning misslyckades med status: ${response.status}`,
        status: response.status,
        time: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Nätverksanslutning fungerar',
      ping_ms: elapsed,
      time: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Nätverkstest misslyckades:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ett okänt fel inträffade',
      stack: process.env.NODE_ENV !== 'production' ? error.stack : null,
      time: new Date().toISOString()
    });
  }
} 