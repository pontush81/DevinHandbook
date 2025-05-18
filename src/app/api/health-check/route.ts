import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to check the health of the application
 * This can be used by the static fallback page to check if the main application is accessible
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'unknown';
  
  // Return basic health information
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      host: host,
      environment: process.env.NODE_ENV || 'development',
      serverInfo: {
        nextVersion: process.env.NEXT_RUNTIME || 'unknown',
        nodeVersion: process.version
      }
    },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
} 