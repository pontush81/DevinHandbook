'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DnsTest() {
  const [host, setHost] = useState('');
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [subdomainTestData, setSubdomainTestData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    setHost(hostname);
    setIsSubdomain(hostname !== 'handbok.org' && hostname.endsWith('.handbok.org'));
    
    fetchDiagnosticData();
    fetchSubdomainTest();
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
  
  const fetchSubdomainTest = async () => {
    try {
      const response = await fetch('/api/subdomain-test');
      if (!response.ok) {
        console.error('Fel vid hämtning av subdomäntest:', response.status);
        return;
      }
      
      const data = await response.json();
      setSubdomainTestData(data);
    } catch (err) {
      console.error('Fel vid subdomäntest:', err);
    }
  };
  
  const testNewSubdomain = async () => {
    const testSubdomain = `test-${Date.now().toString(36)}`;
    const url = `https://${testSubdomain}.handbok.org/dns-test`;
    
    window.open(url, '_blank');
  };
  
  const testSubdomainApi = async () => {
    window.open('/api/subdomain-test', '_blank');
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
            
            {subdomainTestData && (
              <div className="border rounded-md p-4 mb-4">
                <h3 className="font-medium mb-2">Subdomäntest-resultat:</h3>
                <div className={`p-3 rounded-md mb-3 ${subdomainTestData.status === 'ok' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={subdomainTestData.status === 'ok' ? 'text-green-700' : 'text-red-700'}>
                    <span className="font-semibold">Status:</span> {subdomainTestData.status}
                  </p>
                  {subdomainTestData.database && (
                    <p className={subdomainTestData.database.connected ? 'text-green-700' : 'text-red-700'}>
                      <span className="font-semibold">Databas:</span> {subdomainTestData.database.connected ? 'Ansluten' : 'Kunde inte ansluta'}
                      {subdomainTestData.database.error && <span className="text-red-700"> ({subdomainTestData.database.error})</span>}
                    </p>
                  )}
                  {subdomainTestData.handbook && (
                    <p className={subdomainTestData.handbook.exists ? 'text-green-700' : 'text-yellow-700'}>
                      <span className="font-semibold">Handbok:</span> {subdomainTestData.handbook.exists ? 'Hittad' : 'Kunde inte hitta handbok för denna subdomän'}
                    </p>
                  )}
                </div>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(subdomainTestData, null, 2)}
                </pre>
              </div>
            )}
            
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
            
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              <Button
                onClick={fetchDiagnosticData}
                className=""
              >
                Uppdatera diagnostik
              </Button>
              <Button
                onClick={testNewSubdomain}
                className=""
              >
                Testa slumpmässig subdomän
              </Button>
              <Button
                onClick={testSubdomainApi}
                className=""
              >
                Testa subdomän API
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="font-medium text-yellow-800 mb-2">Vercel-domänkonfiguration</h3>
              <p className="text-yellow-700 mb-2">
                För att subdomäner ska fungera korrekt behöver du kontrollera:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-yellow-700">
                <li>Att du har en wildcard-domän (<code>*.handbok.org</code>) konfigurerad i Vercel-projektet</li>
                <li>Att din DNS-leverantör har en CNAME eller A-record för <code>*.handbok.org</code></li>
                <li>Att du har väntat tillräckligt länge för att DNS-ändringarna ska spridas (kan ta upp till 48 timmar)</li>
              </ol>
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