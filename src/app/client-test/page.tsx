'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function ClientTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Funktion för att testa anslutning direkt från klienten
  const testClientConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Hämta miljövariabler
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Validera miljövariabler
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Saknar Supabase-konfiguration. Kontrollera dina miljövariabler.');
      }
      
      // Skapar klienten
      console.log('Skapar klient för:', supabaseUrl);
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Testar anslutningen
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('handbooks')
        .select('count')
        .limit(1);
        
      const endTime = Date.now();
      
      if (error) {
        throw error;
      }
      
      // Framgångsrikt resultat
      setResult({
        success: true,
        data,
        timing: endTime - startTime,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Test failed:', err);
      setError(err.message || 'Okänt fel');
      setResult({
        success: false,
        error: err.message,
        details: err.details || err.cause || null,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Kör testet när sidan laddas
  useEffect(() => {
    testClientConnection();
  }, []);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Klientanslutningstest</h1>
      
      <div className="mb-4">
        <p>Denna sida testar anslutning till Supabase direkt från klientens webbläsare.</p>
        <p className="text-sm text-gray-500 mb-4">
          Klienten använder enbart NEXT_PUBLIC_* miljövariabler som är tillgängliga i webbläsaren.
        </p>
      </div>
      
      <div className="mb-4">
        <button 
          onClick={testClientConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
        >
          {loading ? 'Testar...' : 'Testa igen'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 border border-red-200 rounded mb-4">
          <h2 className="text-red-700 font-bold">Fel</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {result && (
        <div className={`p-4 border rounded mb-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h2 className={`font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? 'Anslutning lyckades!' : 'Anslutning misslyckades'}
          </h2>
          
          <div className="mt-4">
            <h3 className="font-semibold">Detaljer:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Testad: {result.timestamp}
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Miljövariabler</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Saknas'}</p>
          <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Finns (visas inte)' : 'Saknas'}</p>
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        </div>
      </div>
    </div>
  );
} 