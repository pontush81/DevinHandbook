'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DnsTest() {
  const [host, setHost] = useState('');
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    setHost(hostname);
    setIsSubdomain(hostname !== 'handbok.org' && hostname.endsWith('.handbok.org'));
    
    fetchDiagnosticData();
  }, []);
  
  const fetchDiagnosticData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/diagnosis');
      if (!response.ok) {
        throw new Error(`Fel vid hämtning av diagnostikdata: ${response.status}`);
      }
      
      const data = await response.json();
      setDiagnosticData(data);
    } catch (err) {
      console.error('Fel vid diagnos:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testNewSubdomain = async () => {
    const testSubdomain = `test-${Date.now().toString(36)}`;
    const url = `https://${testSubdomain}.handbok.org/dns-test`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">DNS-konfigurationstest</h1>
        <p className="text-gray-600">
          Här kan du testa att DNS-konfigurationen för subdomäner fungerar korrekt
        </p>
        <p className="text-gray-600 mt-1">
          Nuvarande host: <span className="font-mono">{host}</span>
        </p>
      </header>
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Hämtar diagnostikdata...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 font-medium">Fel vid diagnosanrop:</p>
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Domänkonfiguration</h2>
              <div className={`p-3 rounded-md ${isSubdomain ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                {isSubdomain ? (
                  <p className="text-green-700">
                    <span className="font-semibold">✓ Subdomän detekterad:</span> {host}
                  </p>
                ) : (
                  <p className="text-blue-700">
                    Du besöker denna sida från huvuddomänen. För att testa subdomänkonfigurationen, besök en subdomän.
                  </p>
                )}
              </div>
            </div>
            
            {diagnosticData && (
              <>
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="font-medium mb-2">Middleware-hantering:</h3>
                  <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(diagnosticData.middleware, null, 2)}
                  </pre>
                </div>
                
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="font-medium mb-2">DNS-konfiguration:</h3>
                  <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(diagnosticData.dns, null, 2)}
                  </pre>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Full diagnostikdata:</h3>
                  <div className="max-h-80 overflow-auto">
                    <pre className="text-xs bg-gray-50 p-2 rounded">
                      {JSON.stringify(diagnosticData, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
            
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={fetchDiagnosticData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Uppdatera diagnostik
              </button>
              
              <button
                onClick={testNewSubdomain}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Testa slumpmässig subdomän
              </button>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-8 text-center">
        <Link href="/test-ui" className="text-blue-600 hover:underline">
          Tillbaka till testsidan
        </Link>
      </div>
    </div>
  );
} 