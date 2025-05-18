import { NextRequest, NextResponse } from 'next/server';
import { getSmartClient } from '@/lib/smart-supabase-client';
import { testDatabaseConnection } from '@/lib/supabase';
import { testDirectConnection } from '@/lib/direct-db';
import { testProxyConnection } from '@/lib/proxy-db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.url;
  const origin = request.headers.get('origin') || '';
  
  // Detect environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';
  const isSubdomain = hostname.includes('.handbok.org') && hostname !== 'handbok.org' && hostname !== 'www.handbok.org';
  
  // Extract subdomain if present
  let subdomain = null;
  if (isSubdomain) {
    const parts = hostname.split('.');
    subdomain = parts[0];
  }
  
  // Create diagnostic data
  const diagnosticData = {
    status: "available",
    message: "CORS diagnostic endpoint is working",
    timestamp: new Date().toISOString(),
    environment: {
      version: "1.0.0",
      mode: process.env.NODE_ENV || "unknown",
      isEdgeRuntime,
      isDevelopment
    },
    request: {
      hostname,
      url,
      origin,
      isSubdomain,
      subdomain
    },
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
      "API resources proxy",
      "improved error handling",
      "fallback font loading"
    ],
    debugTools: [
      "/debug.html",
      "?debug=1 URL parameter"
    ]
  };
  
  return NextResponse.json(diagnosticData, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 