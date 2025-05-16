import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // Get current hostname
  const host = request.headers.get('host') || '';
  const isSubdomain = host !== 'handbok.org' && host.endsWith('.handbok.org');
  const isWww = host === 'www.handbok.org';

  // Create diagnostic information
  const diagnosticData = {
    status: 'ok',
    environment: {
      timestamp: new Date().toISOString(),
      host: host,
      isSubdomain: isSubdomain,
      isWww: isWww,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    },
    cors: {
      corsHeadersPresent: true,
      accessControlAllowOrigin: '*',
      accessControlAllowMethods: 'GET, POST, OPTIONS',
      accessControlAllowHeaders: 'Content-Type, Authorization, X-Requested-With'
    },
    recommendation: isSubdomain 
      ? "För subdomäner, använd CORS-diagnosverktyget på /debug.html för att åtgärda resursladdningsproblem."
      : "Ingen CORS-åtgärd krävs på huvuddomänen."
  };

  // Return with CORS headers
  return NextResponse.json(diagnosticData, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
} 