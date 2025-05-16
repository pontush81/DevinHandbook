import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }
  
  // Säkerställ att vi endast hämtar resurser från _next
  if (!path.startsWith('/_next/') && !path.startsWith('/static/')) {
    return new NextResponse('Invalid path', { status: 400 });
  }
  
  try {
    // Hämta resursen från huvuddomänen
    const resourceURL = `https://handbok.org${path}`;
    const response = await fetch(resourceURL);
    
    if (!response.ok) {
      return new NextResponse(`Resource fetch failed: ${response.status}`, { 
        status: response.status 
      });
    }
    
    // Klona svaret och lägg till CORS-headers
    const body = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    const headers = new Headers({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=31536000, immutable'
    });
    
    return new NextResponse(body, {
      headers,
      status: 200
    });
  } catch (error) {
    console.error('Resource proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function OPTIONS() {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400'
  });
  
  return new NextResponse(null, {
    headers,
    status: 204
  });
} 