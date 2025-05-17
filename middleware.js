// Detta är en Vercel middleware som körs på edge level (Server side)
// Nu förenklad för att bara hantera CORS och undvika redirects

export const config = {
  matcher: [
    // Bara matcha faktiska API-anrop som kan behöva CORS-headers
    '/api/:path*',
  ]
};

export default async function middleware(request) {
  // Enkelt svar för CORS preflight-requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // För alla andra förfrågningar, fortsätt normalt
  return Response.next();
} 