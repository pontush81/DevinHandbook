'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TestUI() {
  const [host, setHost] = useState('');
  
  useEffect(() => {
    setHost(window.location.hostname);
  }, []);
  
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