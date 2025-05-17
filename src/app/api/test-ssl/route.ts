import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const preferredRegion = ['arn1'];

// Funktion för att testa SSL-anslutningar med olika metoder
async function testSslConnection(url: string) {
  if (!url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  const results = [];
  const options = [
    { method: 'GET', name: 'GET Standard' },
    { method: 'HEAD', name: 'HEAD Lightweight' },
    { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      name: 'GET med JSON Accept'
    },
    { 
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)' },
      name: 'GET med User-Agent'
    },
    { 
      method: 'GET',
      headers: { 'Origin': 'https://test.handbok.org' },
      name: 'GET med Origin'
    }
  ];
  
  for (const option of options) {
    try {
      console.log(`Testar ${option.name} för ${url}`);
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        method: option.method,
        headers: option.headers || {},
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      
      results.push({
        name: option.name,
        success: true,
        status: response.status,
        statusText: response.statusText,
        timing: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      results.push({
        name: option.name,
        success: false,
        error: error.message,
        errorName: error.name,
        timing: null,
      });
    }
  }
  
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return NextResponse.json({
        error: 'Supabase URL saknas',
        details: 'Kontrollera miljövariabeln NEXT_PUBLIC_SUPABASE_URL',
        time: new Date().toISOString()
      }, { status: 500 });
    }
    
    console.log(`Testar SSL-anslutning till: ${supabaseUrl}`);
    
    // Test 1: Direkt fetch med GET
    let fetchResult;
    try {
      const startTime = Date.now();
      const response = await fetch(supabaseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      fetchResult = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        timing: Date.now() - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cloudflareSSLError: response.status === 526 || response.status === 525
      };
      
      // Om det är ett Cloudflare SSL-fel
      if (fetchResult.cloudflareSSLError) {
        fetchResult.diagnosis = "Cloudflare kan inte validera SSL-certifikatet för Supabase-projektet.";
        fetchResult.solution = "Kontrollera projektstatus i Supabase-konsolen eller kontakta Supabase-support.";
      }
      
    } catch (fetchError) {
      fetchResult = {
        success: false,
        error: fetchError.message,
        code: fetchError.code,
        cause: fetchError.cause ? String(fetchError.cause) : null
      };
    }
    
    // Test 2: Supabase-anropet
    let supabaseResult;
    try {
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseAnonKey) {
        const startTime = Date.now();
        
        // Skapa en Supabase-klient för test
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { 
            persistSession: false,
            autoRefreshToken: false
          }
        });
        
        // Försök göra en enkel fråga
        const { data, error } = await supabase
          .from('handbooks')
          .select('id')
          .limit(1);
          
        supabaseResult = {
          success: !error,
          data: data ? { count: data.length } : null,
          error: error ? error.message : null,
          timing: Date.now() - startTime
        };
      } else {
        supabaseResult = {
          success: false,
          error: 'Supabase Anon Key saknas',
          details: 'Kontrollera miljövariabeln NEXT_PUBLIC_SUPABASE_ANON_KEY'
        };
      }
    } catch (supabaseError) {
      supabaseResult = {
        success: false,
        error: supabaseError.message,
        cause: supabaseError.cause ? String(supabaseError.cause) : null
      };
    }
    
    // Sammanställ resultat
    const isCloudflareSSLError = 
      (fetchResult?.cloudflareSSLError) || 
      (fetchResult?.status === 526) ||
      (supabaseResult?.error && String(supabaseResult.error).includes('SSL')) ||
      (supabaseResult?.error && String(supabaseResult.error).includes('526'));
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        runtime: typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node',
        region: process.env.VERCEL_REGION || 'unknown'
      },
      tests: {
        fetch: fetchResult,
        supabase: supabaseResult
      },
      diagnosis: {
        isCloudflareSSLError,
        primaryIssue: isCloudflareSSLError 
          ? 'Cloudflare SSL-valideringsfel (Error 526)' 
          : (!fetchResult.success && !supabaseResult.success)
            ? 'Generellt anslutningsfel till Supabase'
            : 'Inget allvarligt problem detekterat',
        recommendation: isCloudflareSSLError
          ? 'Kontrollera status för din Supabase-instans i Supabase-konsolen. Detta är troligen ett tillfälligt problem med SSL-certifikatet eller Cloudflare.'
          : 'Kontrollera nätverksanslutningen till Supabase eller att din projektinstans är aktiv.'
      }
    });
  } catch (error) {
    console.error('SSL-test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ett oväntat fel inträffade',
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Tillåt also CORS för enkel testning
export async function OPTIONS(req: NextRequest) {
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