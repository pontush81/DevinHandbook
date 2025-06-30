import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { requireDevOrStagingEnvironment } from '@/lib/security-utils';

export const runtime = 'edge';
export const preferredRegion = ['arn1'];

export async function GET(request: NextRequest) {
  // Säkerhetskontroll - endast tillgänglig i dev/staging
  const securityCheck = requireDevOrStagingEnvironment('test-direct');
  if (securityCheck) {
    return securityCheck;
  }

  try {
    // Hämta konfiguration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        error: 'Supabase konfiguration saknas',
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      }, { status: 500 });
    }
    
    // Skapa en Supabase-klient med anonym nyckel (säker för klientsidan)
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    
    // Hämta lite data för att testa anslutningen
    const { data, error } = await supabase
      .from('handbooks')
      .select('id, title')
      .limit(1);
      
    if (error) {
      throw new Error(error.message, { cause: error });
    }
    
    // Returnera resultatet
    return NextResponse.json({
      success: !error,
      error: error?.message,
      data: data || [],
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
    
  } catch (error) {
    console.error('Direktanslutningsfel:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 