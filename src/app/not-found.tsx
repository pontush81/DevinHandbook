import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404 - Sidan kunde inte hittas</h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Vi kan tyvärr inte hitta sidan du letar efter. Den kan ha flyttats eller tagits bort.
        </p>
        
        <div className="border-t border-b border-gray-200 py-8 my-8">
          <p className="text-md text-gray-500 mb-4">Felkod: 404 Not Found</p>
          
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Button size="lg">
                Gå till startsidan
              </Button>
            </Link>
            
            <Link href="/debug.html" className="inline-block ml-4">
              <Button variant="outline" size="lg">
                CORS Diagnos
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Har du problem med att ladda resurser på en subdomän?</p>
          <p className="mt-2">
            Detta kan bero på CORS-begränsningar. Prova att använda 
            <Link href="/debug.html" className="text-blue-600 hover:underline">
              {' '}diagnosverktyget
            </Link> för att åtgärda problemet.
          </p>
        </div>
      </div>
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Detect if we're on a subdomain with potential CORS issues
            (function() {
              const host = window.location.hostname;
              if (host.endsWith('.handbok.org') && host !== 'handbok.org' && host !== 'www.handbok.org') {
                console.log('404 page on subdomain, loading resource fix script');
                
                // Add the static resource fix script
                const script = document.createElement('script');
                script.src = '/static-resource-fix.js';
                script.async = true;
                document.head.appendChild(script);
                
                // Add debugging info to console
                console.log('Debug info:', {
                  subdomain: host,
                  path: window.location.pathname,
                  url: window.location.href
                });
              }
            })();
          `
        }}
      />
    </div>
  );
} 