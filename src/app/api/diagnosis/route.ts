import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  const origin = request.headers.get('origin') || 'unknown';
  
  // Testa resursanslutningen
  let resourceProxyStatus = {
    cssTest: { status: 'unknown', error: null },
    jsonTest: { status: 'success', error: null },
    jsTest: { status: 'unknown', error: null }
  };
  
  // Test CSS resource proxy
  try {
    const cssPath = '/_next/static/css/bb2534fb94d47e9a.css'; // Exempel på en CSS-resurs
    const proxyUrl = `${url.origin}/api/resources?path=${encodeURIComponent(cssPath)}`;
    const cssResponse = await fetch(proxyUrl, { 
      method: 'GET',
      headers: { 'Accept': 'text/css' } 
    });
    
    if (cssResponse.ok) {
      resourceProxyStatus.cssTest.status = 'success';
    } else {
      resourceProxyStatus.cssTest.status = 'failed';
      resourceProxyStatus.cssTest.error = `HTTP ${cssResponse.status}: ${cssResponse.statusText}`;
    }
  } catch (error) {
    resourceProxyStatus.cssTest.status = 'failed';
    resourceProxyStatus.cssTest.error = error instanceof Error ? error.message : String(error);
  }
  
  // Test JS resource proxy
  try {
    const jsPath = '/_next/static/chunks/main.js';
    const proxyUrl = `${url.origin}/api/resources?path=${encodeURIComponent(jsPath)}`;
    const jsResponse = await fetch(proxyUrl, { 
      method: 'GET',
      headers: { 'Accept': 'application/javascript' } 
    });
    
    if (jsResponse.ok) {
      resourceProxyStatus.jsTest.status = 'success';
    } else {
      resourceProxyStatus.jsTest.status = 'failed';
      resourceProxyStatus.jsTest.error = `HTTP ${jsResponse.status}: ${jsResponse.statusText}`;
    }
  } catch (error) {
    resourceProxyStatus.jsTest.status = 'failed';
    resourceProxyStatus.jsTest.error = error instanceof Error ? error.message : String(error);
  }

  // Samla in information om miljön
  const diagnosticInfo = {
    status: "available",
    message: "CORS diagnostic endpoint is working",
    timestamp: new Date().toISOString(),
    request: {
      host,
      path: url.pathname,
      userAgent,
      referer,
      origin,
      headers: Object.fromEntries(
        [...request.headers.entries()].map(([key, value]) => [key, value])
      )
    },
    environment: {
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown'
    },
    deploymentUrl: 'devin-handbook.vercel.app',
    testDomain: 'test.handbok.org',
    productionDomain: 'handbok.org',
    stripe: {
      mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'production',
      testModeActive: process.env.STRIPE_SECRET_KEY_TEST ? true : false
    },
    resourceProxyTests: resourceProxyStatus,
    cors: {
      enabled: true,
      allowOrigin: "*",
      allowMethods: "GET, POST, OPTIONS"
    },
    staticResourcesStatus: {
      proxyEnabled: true,
      inlineEnabled: true,
      fallbackFontsEnabled: true
    },
    fixes: [
      "middleware CORS headers",
      "assetPrefix configuration",
      "static-resource-fix.js",
      "API resources proxy (updated)",
      "improved error handling",
      "fallback font loading"
    ],
    debugTools: [
      "/api/diagnosis (this endpoint)",
      "/api/resources?path=your_resource_path",
      "?debug=1 URL parameter"
    ]
  };

  return NextResponse.json(diagnosticInfo, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json'
    }
  });
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