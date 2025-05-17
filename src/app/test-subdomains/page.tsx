'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function TestSubdomains() {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | { 
    success: boolean; 
    url?: string; 
    error?: string; 
    details?: string;
    status?: number;
    errorInfo?: any;
  }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('Försöker skapa handbok:', { name, subdomain });
      
      const response = await fetch('/api/test/create-handbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, subdomain }),
      });
      
      console.log('Statuskod från API:', response.status);
      
      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Fel vid parsning av API-svar:', jsonError);
        const responseText = await response.text();
        console.log('Råtext från API:', responseText);
        throw new Error('Kunde inte tolka svaret från API:et');
      }
      
      console.log('Svar från API:', data);
      
      if (!response.ok) {
        setResult({ 
          success: false, 
          error: data.error || 'Serverfel', 
          details: data.details || 'Ingen ytterligare information',
          status: response.status,
          errorInfo: data.errorInfo
        });
      } else {
        setResult({
          success: true,
          url: data.url,
          ...data
        });
      }
    } catch (error) {
      console.error('Nätverksfel:', error);
      setResult({ 
        success: false, 
        error: `Nätverksfel: ${error.message}`,
        details: 'Ett fel uppstod när anropet skulle skickas till servern. Kontrollera din internetanslutning.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Testa subdomänskapande</h1>
        <p className="text-gray-600">Detta verktyg är endast för testning av subdomänfunktionalitet i testmiljön</p>
      </header>
      
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Handbokens namn</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Min Testförening"
              required
            />
          </div>
          
          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700">Subdomän</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="block w-full border border-gray-300 rounded-l-md px-3 py-2"
                placeholder="min-test"
                required
                pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
                title="Subdomänen får endast innehålla små bokstäver, siffror och bindestreck. Den får inte börja eller sluta med bindestreck."
              />
              <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
                .handbok.org
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Endast små bokstäver, siffror och bindestreck. Inga specialtecken eller mellanslag.
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Skapar...' : 'Skapa testhandbok'}
          </button>
        </form>
        
        {result && (
          <div className={`mt-6 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <>
                <p className="text-green-700 font-semibold">Handboken skapades framgångsrikt!</p>
                <p className="mt-2">Din handbok finns på: </p>
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block mt-1 text-blue-600 font-medium hover:underline"
                >
                  {result.url}
                </a>
                <p className="mt-4 text-sm text-gray-600">
                  Det kan ta upp till en minut innan handboken är tillgänglig på den nya subdomänen.
                </p>
              </>
            ) : (
              <>
                <p className="text-red-700 font-semibold">Ett fel uppstod{result.status ? ` (${result.status})` : ''}:</p>
                <p className="mt-1 text-red-600">{result.error}</p>
                {result.details && <p className="mt-1 text-sm text-red-500">{result.details}</p>}
                {result.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-500 cursor-pointer">Detaljerad felinformation</summary>
                    <pre className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded overflow-auto">
                      {JSON.stringify(result.errorInfo, null, 2)}
                    </pre>
                  </details>
                )}
              </>
            )}
          </div>
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