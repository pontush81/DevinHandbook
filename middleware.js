// Detta är en Vercel middleware som körs på edge level (Server side)
// Denna fil är placerad i root-katalogen (utanför src) för att Vercel ska hitta den först
// TEMPORÄRT INAKTIVERAD FÖR ATT DIAGNOSTISERA REDIRECT-PROBLEM

export const config = {
  matcher: [
    // Inaktiverar matcher tillfälligt för att stoppa alla redirects
    '/_debugger_disable_matcher_temporarily_/*'
  ]
};

export default async function middleware(request) {
  // Enkel passthrough - inga redirects
  return Response.next();
} 