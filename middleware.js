// MIDDLEWARE HELT INAKTIVERAD - INGEN REDIREKTSHANTERING

// Middleware för att hantera subdomäner och CORS

export const config = {
  // Matcha alla sökvägar
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export default async function middleware(request) {
  // Lägg till CORS-headers för alla svar
  const response = Response.next();
  
  // Berika med CORS-headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  return response;
} 