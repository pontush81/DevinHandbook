'use client';

import Image from "next/image";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isTestDomain, setIsTestDomain] = useState(false);
  const [host, setHost] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    // Kolla om vi är på testdomänen
    const hostname = window.location.hostname;
    setHost(hostname);
    
    // För testdomänen
    if (hostname === 'test.handbok.org') {
      // Om URL-parametern visar test-ui, visa testsidan
      if (window.location.search.includes('test-ui=true')) {
        setIsTestDomain(true);
      } else {
        // Annars, omdirigera till själva applikationen
        router.push('/create-handbook');
      }
    } else if (hostname === 'handbok.org' || hostname === 'www.handbok.org') {
      // För huvuddomänen, omdirigera till landningssidan
      router.push('/landing');
    }
  }, [router]);
  
  if (isTestDomain) {
    return (
      <div className="flex flex-col min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
        <header className="py-4 border-b mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Handbok.org - Testmiljö</h1>
          <p className="text-gray-600">Du är på {host} - testversionen av Handbok.org</p>
        </header>
        
        <main className="flex-grow">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-700 mb-6">
            <strong>Testmiljö!</strong> Du är nu i testmiljön för Handbok.org. 
            <p className="mt-2">Här kan du testa nya funktioner och Stripe-betalningar i testläge utan att påverka produktionsdata.</p>
          </div>
          
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link 
              href="/create-handbook" 
              className="w-full sm:w-auto text-center py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-lg shadow-sm"
            >
              Gå till applikationen →
            </Link>
            
            <Link 
              href="/view" 
              className="w-full sm:w-auto text-center py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md text-lg shadow-sm"
            >
              Öppna handböcker →
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Diagnostikverktyg</h2>
              <p className="text-gray-600 mb-4">Kontrollera resursladdning och konfigurationer</p>
              <Link 
                href="/test-resources" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                Öppna testverktyg
              </Link>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">API-tester</h2>
              <p className="text-gray-600 mb-4">Testa API-endpoints och diagnostik</p>
              <div className="space-y-2">
                <a 
                  href="/api/debug" 
                  className="block text-blue-600 hover:text-blue-800"
                  target="_blank"
                >
                  /api/debug - Allmän debug
                </a>
                <a 
                  href="/api/debug?mode=resource-test" 
                  className="block text-blue-600 hover:text-blue-800"
                  target="_blank"
                >
                  /api/debug?mode=resource-test - Resurstester
                </a>
                <a 
                  href="/api/diagnosis" 
                  className="block text-blue-600 hover:text-blue-800"
                  target="_blank"
                >
                  /api/diagnosis - Systemdiagnostik
                </a>
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Stripe Test</h2>
              <p className="text-gray-600 mb-4">Testa Stripe-integrationen med testkort</p>
              <Link 
                href="/create-handbook?test=1" 
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
              >
                Testa betalning
              </Link>
              <div className="mt-3 text-sm text-gray-500">
                Använd kortnummer: 4242 4242 4242 4242
              </div>
            </div>
            
            <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Miljöinformation</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Miljö:</strong> Test</div>
                <div><strong>Stripe-läge:</strong> Testläge</div>
                <div><strong>Branch:</strong> staging</div>
                <div><strong>Domän:</strong> {host}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <p className="text-center text-gray-700 font-semibold">För att alltid gå direkt till applikationen, använd denna adress:</p>
            <p className="text-center font-mono bg-gray-100 p-2 rounded mt-2">
              <a href="https://test.handbok.org/create-handbook" className="text-blue-600 hover:underline">
                https://test.handbok.org/create-handbook
              </a>
            </p>
          </div>
        </main>
        
        <footer className="mt-12 pt-4 border-t text-center text-gray-500 text-sm">
          <p>Handbok.org Testmiljö - Används endast för testning</p>
          <p className="mt-1">
            <Link href="https://handbok.org" className="text-blue-600 hover:underline">
              Besök produktionsmiljön
            </Link>
          </p>
        </footer>
      </div>
    );
  }
  
  // Visa en enkel laddningsvy medan omdirigeringen sker
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Handbok.org</h1>
        <p className="text-gray-600">Laddar...</p>
      </div>
    </div>
  );
}
