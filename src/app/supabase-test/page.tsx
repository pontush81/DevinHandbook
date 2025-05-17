'use client';

import { useState, useEffect } from 'react';
import { SupabaseProxyClient } from '@/lib/supabase-proxy-client';

export default function SupabaseTestPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [proxyResult, setProxyResult] = useState<any>(null);
  const [directResult, setDirectResult] = useState<any>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  
  const runTests = async () => {
    setLoading(true);
    setDiagnostics(null);
    setProxyResult(null);
    setDirectResult(null);
    setDirectError(null);
    setProxyError(null);
    
    try {
      // 1. Kör diagnostiktest
      const diagResponse = await fetch('/api/supabase-diagnosis');
      const diagData = await diagResponse.json();
      setDiagnostics(diagData);
      
      // 2. Testa proxy-klienten
      try {
        const proxyClient = new SupabaseProxyClient('/api/supabase-proxy', 1);
        const proxyStartTime = Date.now();
        const { data, error } = await proxyClient.select('handbooks', { limit: 2 });
        const proxyEndTime = Date.now();
        
        if (error) {
          setProxyError(error.message || 'Okänt fel');
        } else {
          setProxyResult({
            data,
            timing: proxyEndTime - proxyStartTime,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err: any) {
        setProxyError(err.message || 'Okänt fel vid proxyanslutning');
      }
      
      // 3. Testa direktanslutning om möjligt (client-side)
      // Detta kommer troligen att misslyckas på vissa miljöer på grund av CORS
      try {
        const directStartTime = Date.now();
        const resp = await fetch('/api/test-direct');
        const directData = await resp.json();
        const directEndTime = Date.now();
        
        setDirectResult({
          data: directData,
          timing: directEndTime - directStartTime,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        setDirectError(err.message || 'Direktanslutning misslyckades');
      }
    } catch (err: any) {
      console.error('Testfel:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Kör testerna vid sidladdning
  useEffect(() => {
    runTests();
  }, []);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Anslutningstest</h1>
      
      <div className="mb-4">
        <p>Denna sida testar anslutning till Supabase på olika sätt för att hjälpa till med felsökning.</p>
        <p className="text-sm text-gray-500 mb-4">
          Testet utför diagnostik, proxyanrop och direkta anrop för att identifiera eventuella problem.
        </p>
      </div>
      
      <div className="mb-6">
        <button 
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
        >
          {loading ? 'Kör tester...' : 'Kör tester igen'}
        </button>
      </div>
      
      {/* Diagnostik-resultat */}
      {diagnostics && (
        <div className={`p-4 border rounded mb-6 ${diagnostics.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h2 className="text-lg font-bold mb-2">
            Serverdiagnostik {diagnostics.success ? '✓' : '⚠️'}
          </h2>
          
          {diagnostics.diagnostics.map((diag: any, index: number) => (
            <div key={index} className="mb-3 p-3 bg-white rounded border">
              <h3 className="font-semibold">
                {diag.check} {diag.success === false || diag.ok === false ? '✗' : diag.success === true || diag.ok === true ? '✓' : ''}
              </h3>
              <div className="mt-1 text-sm">
                <pre className="overflow-auto">{JSON.stringify(diag, null, 2)}</pre>
              </div>
            </div>
          ))}
          
          <div className="mt-2 text-sm text-gray-600">
            Körd: {diagnostics.time}
          </div>
        </div>
      )}
      
      {/* Proxy-resultat */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 border rounded ${proxyResult ? 'bg-green-50 border-green-200' : proxyError ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <h2 className="text-lg font-bold mb-2">
            Proxy-anslutning
            {proxyResult ? ' ✓' : proxyError ? ' ✗' : ' ⌛'}
          </h2>
          
          {proxyError && (
            <div className="mb-3 p-2 bg-red-100 rounded">
              <p className="text-red-700">{proxyError}</p>
            </div>
          )}
          
          {proxyResult && (
            <div>
              <p className="mb-2">Anslutningen lyckades på {proxyResult.timing} ms</p>
              <div className="bg-white p-2 rounded border">
                <pre className="text-xs overflow-auto">{JSON.stringify(proxyResult.data, null, 2)}</pre>
              </div>
            </div>
          )}
          
          {!proxyResult && !proxyError && loading && (
            <div className="text-gray-500">Testar proxy-anslutning...</div>
          )}
        </div>
        
        <div className={`p-4 border rounded ${directResult ? 'bg-green-50 border-green-200' : directError ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <h2 className="text-lg font-bold mb-2">
            Direktanslutning
            {directResult ? ' ✓' : directError ? ' ✗' : ' ⌛'}
          </h2>
          
          {directError && (
            <div className="mb-3 p-2 bg-red-100 rounded">
              <p className="text-red-700">{directError}</p>
            </div>
          )}
          
          {directResult && (
            <div>
              <p className="mb-2">Direktanslutningen lyckades på {directResult.timing} ms</p>
              <div className="bg-white p-2 rounded border">
                <pre className="text-xs overflow-auto">{JSON.stringify(directResult.data, null, 2)}</pre>
              </div>
            </div>
          )}
          
          {!directResult && !directError && loading && (
            <div className="text-gray-500">Testar direktanslutning...</div>
          )}
        </div>
      </div>
      
      {/* Miljövariabler */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Miljövariabler</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
          <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Finns' : '✗ Saknas'}</p>
          <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Finns' : '✗ Saknas'}</p>
          <p className="mt-2 text-sm text-gray-500">Notera: Service Role-nyckeln är endast tillgänglig på serversidan.</p>
        </div>
      </div>
      
      {/* Lösningsförslag */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="text-xl font-bold mb-2">Lösningsförslag</h2>
        <ul className="list-disc pl-6">
          <li className="mb-2">
            Kontrollera att miljövariablerna är korrekt inställda i <code>.env.local</code> eller på Vercel.
          </li>
          <li className="mb-2">
            Försäkra dig om att Supabase URL börjar med <code>https://</code>.
          </li>
          <li className="mb-2">
            Om proxy-anslutningen fungerar men inte direktanslutningen, använd Proxy-klienten för alla anrop.
          </li>
          <li className="mb-2">
            Om varken proxy- eller direktanslutningen fungerar, kontrollera om Supabase-tjänsten är tillgänglig.
          </li>
        </ul>
      </div>
    </div>
  );
} 