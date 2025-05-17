import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const preferredRegion = ['arn1'];

export async function GET(request: NextRequest) {
  try {
    // Hämta konfiguration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Saknar Supabase-konfiguration',
        details: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey
        }
      }, { status: 500 });
    }
    
    // Skapa en Supabase-klient med anonym nyckel (säker för klientsidan)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
    
    // Hämta lite data för att testa anslutningen
    const { data, error } = await supabase
      .from('handbooks')
      .select('id, title')
      .limit(5);
      
    if (error) {
      throw new Error(error.message, { cause: error });
    }
    
    // Returnera resultatet
    return NextResponse.json({
      success: true,
      message: 'Direktanslutning till Supabase lyckades',
      data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Direktanslutningsfel:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.cause,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 