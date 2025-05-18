"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Kontrollera om användaren kommer från en subdomän
    const hostname = window.location.hostname;
    const isDevelopment = hostname === 'localhost';
    const isVercel = hostname.includes('vercel.app');
    const isMainDomain = hostname === 'handbok.org' || hostname === 'www.handbok.org';
    
    if (!isDevelopment && !isVercel && !isMainDomain) {
      // Extrahera subdomän från hostname
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        const extractedSubdomain = parts[0];
        setSubdomain(extractedSubdomain);
        // Omdirigera till view-sidan
        setIsRedirecting(true);
        router.push(`/view?company=${extractedSubdomain}`);
      }
    }
  }, [router]);

  if (isRedirecting && subdomain) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">Omdirigerar...</h1>
        <p className="text-gray-500">Du tas till handboken för {subdomain}.</p>
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-700">
            Om du inte omdirigeras automatiskt, 
            <a href={`/view?company=${subdomain}`} className="underline ml-1">
              klicka här
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6">
          Välkommen till Handbok.org
        </h1>
        <p className="text-gray-600 mb-8">
          Den digitala plattformen för bostadsrättsföreningar att skapa och dela handböcker.
        </p>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <a 
            href="/create-handbook" 
            className="bg-black text-white px-6 py-4 rounded-md text-center hover:bg-gray-800 transition"
          >
            Skapa ny handbok
          </a>
          
          <div className="border rounded-md p-4">
            <h2 className="font-semibold mb-2">Öppna befintlig handbok</h2>
            <div className="flex">
              <input 
                type="text" 
                placeholder="Ange namn på förening" 
                className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-black"
                onChange={e => setSubdomain(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && subdomain) {
                    router.push(`/view?company=${subdomain}`);
                  }
                }}
              />
              <button 
                className="bg-gray-200 px-4 py-2 rounded-r-md hover:bg-gray-300"
                onClick={() => {
                  if (subdomain) {
                    router.push(`/view?company=${subdomain}`);
                  }
                }}
              >
                Visa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
