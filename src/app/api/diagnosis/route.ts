import { NextRequest, NextResponse } from 'next/server';
import { getSmartClient } from '@/lib/smart-supabase-client';
import { testDatabaseConnection } from '@/lib/supabase';
import { testDirectConnection } from '@/lib/direct-db';
import { testProxyConnection } from '@/lib/proxy-db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Hämta detaljerad information om miljön
    const environment = {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL_ENV: process.env.VERCEL_ENV || 'unknown',
      VERCEL_URL: process.env.VERCEL_URL || 'unknown',
      VERCEL_REGION: process.env.VERCEL_REGION || 'unknown',
      IS_EDGE_RUNTIME: typeof EdgeRuntime !== 'undefined',
      IS_SERVER: typeof window === 'undefined',
      SUPABASE_URL_STATUS: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
      SUPABASE_URL_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 12) + '...' 
        : 'missing',
      HAS_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      HAS_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // Utför ett grundläggande nätverkstest för att kontrollera om vi kan nå externa tjänster
    const networkTest = await testNetwork();

    // Testa olika anslutningsmetoder
    console.log('Testar standardanslutning...');
    const standardConnection = await testDatabaseConnection();

    console.log('Testar direktanslutning...');
    const directConnection = await testDirectConnection();

    console.log('Testar proxyanslutning...');
    const proxyConnection = await testProxyConnection();

    // Hämta SmartClient och kör en fullständig diagnos
    console.log('Kör SmartClient-diagnos...');
    const smartClient = getSmartClient();
    const smartDiagnosis = await smartClient.diagnose();

    // Utför ett specifikt SSL-test mot Supabase för att detektera Cloudflare-problem
    console.log('Kontrollerar specifikt för Cloudflare SSL-fel...');
    const cloudflareTest = await testCloudflareSSL();

    // Samla rekommendationer baserat på testresultaten
    const recommendations = generateRecommendations({
      environment,
      networkTest,
      standardConnection,
      directConnection,
      proxyConnection,
      smartDiagnosis,
      cloudflareTest
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment,
      tests: {
        network: networkTest,
        standard: standardConnection,
        direct: directConnection,
        proxy: proxyConnection,
        cloudflare: cloudflareTest
      },
      smartDiagnosis,
      recommendations,
      summary: {
        hasCloudflareSSLError: cloudflareTest.hasCloudflareIssue,
        bestWorkingMethod: determineBestMethod(directConnection, proxyConnection, standardConnection),
        allMethodsFailing: !directConnection.connected && !proxyConnection.connected && !standardConnection.connected,
        sslErrorDetected: detectSSLError(directConnection, proxyConnection, standardConnection, cloudflareTest)
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Diagnostikfel:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Ett okänt fel inträffade under diagnostiken',
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

// Testa om vi kan nå externa tjänster för att kontrollera grundläggande nätverksanslutning
async function testNetwork() {
  try {
    // Testa anslutning till en pålitlig extern tjänst
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      cache: 'no-store'
    });
    
    return {
      connected: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

// Testa specifikt för Cloudflare SSL-validerings problem
async function testCloudflareSSL() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return {
        hasCloudflareIssue: false,
        error: 'Saknar Supabase URL',
        details: null
      };
    }
    
    // Försök ansluta direkt till Supabase URL (utan anrop via API)
    const response = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    
    // Cloudflare-relaterade felkoder
    const cloudflareErrorCodes = [526, 525, 522];
    
    if (!response.ok && cloudflareErrorCodes.includes(response.status)) {
      return {
        hasCloudflareIssue: true,
        statusCode: response.status,
        statusText: response.statusText,
        details: `SSL-valideringsfel från Cloudflare (Error ${response.status}). Supabase-projektets SSL-certifikat kunde inte valideras.`
      };
    }
    
    return {
      hasCloudflareIssue: false,
      statusCode: response.status,
      statusText: response.statusText,
      details: null
    };
  } catch (error) {
    // Även vissa nätverksfel kan indikera Cloudflare-problem
    const isCloudflareRelated = 
      error.message?.includes('526') || 
      error.message?.includes('525') || 
      error.message?.includes('SSL') || 
      error.message?.includes('certificate');
    
    return {
      hasCloudflareIssue: isCloudflareRelated,
      error: error.message,
      details: error.cause ? String(error.cause) : null
    };
  }
}

// Avgör vilken anslutningsmetod som fungerar bäst
function determineBestMethod(direct, proxy, standard) {
  if (direct.connected) return 'direct';
  if (proxy.connected) return 'proxy';
  if (standard.connected) return 'standard';
  return 'none';
}

// Detektera om det finns SSL-fel i något av testresultaten
function detectSSLError(direct, proxy, standard, cloudflare) {
  // Kontrollera för explicita Cloudflare-fel
  if (cloudflare.hasCloudflareIssue) return true;
  
  // Sök efter SSL-relaterade felmeddelanden i anslutningsresultaten
  const directError = typeof direct.error === 'string' ? direct.error : '';
  const proxyError = typeof proxy.error === 'string' ? proxy.error : '';
  const standardError = typeof standard.error === 'string' ? standard.error : '';
  
  const sslErrorPatterns = ['SSL', 'certificate', '526', 'cloudflare', 'validation'];
  
  return sslErrorPatterns.some(pattern => 
    directError.toLowerCase().includes(pattern.toLowerCase()) ||
    proxyError.toLowerCase().includes(pattern.toLowerCase()) ||
    standardError.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Generera anpassade rekommendationer baserat på testresultaten
function generateRecommendations(results) {
  const recommendations = [];
  
  // Kontrollera för Cloudflare SSL-validering (Error 526)
  if (results.cloudflareTest.hasCloudflareIssue || 
      results.smartDiagnosis.tests.cloudflareCheck.hasCloudflareIssue) {
    
    recommendations.push({
      problem: 'Cloudflare SSL-valideringsfel (Error 526)',
      explanation: 'Din Supabase-instans har problem med SSL-certifikatet som Cloudflare inte kan validera.',
      steps: [
        '1. Gå till Supabase Dashboard och kontrollera projektets status.',
        '2. I Supabase Dashboard, kontrollera om projektet har status "Healthy".',
        '3. Om projektet är pausat, starta det igen.',
        '4. Om projektet är igång men fortfarande inte fungerar, kontakta Supabase-support angående SSL-certifikatet.'
      ],
      priority: 'high'
    });
  }
  
  // Lägg till rekommendationer baserat på vilka anslutningsmetoder som fungerar
  if (results.directConnection.connected) {
    recommendations.push({
      problem: 'Fortsätt använda direktanslutning',
      explanation: 'Direktanslutning fungerar för närvarande - använd SmartClient för att hantera anslutningar och fallbacks automatiskt.',
      priority: 'low'
    });
  } else if (results.proxyConnection.connected) {
    recommendations.push({
      problem: 'Direktanslutning misslyckades men proxy fungerar',
      explanation: 'SmartClient använder automatiskt proxy som fallback, men du bör undersöka varför direktanslutningen misslyckas för bättre prestanda.',
      priority: 'medium'
    });
  } else if (!results.directConnection.connected && !results.proxyConnection.connected) {
    recommendations.push({
      problem: 'Alla anslutningsmetoder misslyckades',
      explanation: 'Inget av anslutningssätten fungerar för närvarande. Detta indikerar ett allvarligt problem med antingen din Supabase-instans eller nätverksanslutningen.',
      steps: [
        '1. Kontrollera att Supabase-projektet är igång och har status "Healthy".',
        '2. Verifiera att miljövariablerna NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY är korrekt konfigurerade.',
        '3. Om du kör på Vercel, kontrollera att miljövariablerna är korrekt konfigurerade även där.',
        '4. Överväg att skapa ett nytt Supabase-projekt om problemet kvarstår.'
      ],
      priority: 'high'
    });
  }
  
  return recommendations;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 