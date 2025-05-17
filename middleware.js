// MIDDLEWARE HELT INAKTIVERAD - INGEN REDIREKTSHANTERING

// Middleware för att hantera subdomäner och CORS

export const config = {
  // Matcha ingen sökväg
  matcher: []
};

export default async function middleware(request) {
  // Passera direkt till Next.js, ingen behandling eller redirect
  return Response.next();
} 