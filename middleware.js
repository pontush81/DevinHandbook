// Detta är en Vercel middleware som körs på edge level (Server side)
// Denna fil är placerad i root-katalogen (utanför src) för att Vercel ska hitta den först

export const config = {
  matcher: [
    '/((?!api/resources|_next/static|_next/image|favicon.ico).*)',
  ]
};

export default async function middleware(request) {
  // Logga information om förfrågan för att hjälpa till med felsökning
  console.log('Middleware processing:', request.url);
  
  // Klona aktuell URL för att hantera omdirigeringar
  const url = new URL(request.url);
  
  // Få host header från förfrågan
  const host = request.headers.get('host') || '';
  
  // Kontrollera om det här är en förfrågan från en specifik subdomän
  const subdomainMatch = host.match(/^(?<subdomain>[^.]+)\.handbok\.org$/);
  
  // Hantera subdomäner inklusive www
  if (subdomainMatch) {
    const subdomain = subdomainMatch.groups?.subdomain;
    
    if (subdomain === 'www') {
      // För www och subdomäner, lämna som de är men lägg till CORS-headers
      // Fortsätt med normalt request flow
      const response = new Response(null, { 
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization'
        }
      });
      
      return response;
    } else {
      // Hantera andra subdomäner
      url.pathname = `/handbook/${subdomain}${url.pathname}`;
      
      // Omdirigera till den korrekta handbook-sidan
      return Response.redirect(url);
    }
  }
  
  // För alla andra förfrågningar, fortsätt normalt
  return new Response(null, { status: 200 });
} 