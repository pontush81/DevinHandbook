'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CorsFixPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Laddar CORS-fix...');
  const [target, setTarget] = useState('/');
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    // Hämta target från URL om den finns
    const urlParams = new URLSearchParams(window.location.search);
    const targetParam = urlParams.get('target');
    if (targetParam) {
      setTarget(targetParam);
    }

    // Lägg till CORS-fix skriptet
    const script = document.createElement('script');
    script.src = '/api/cors-fix';
    script.async = true;
    script.onload = () => {
      setStatus('CORS-fix har tillämpats framgångsrikt!');
      setIsFixed(true);
    };
    script.onerror = () => {
      setStatus('Något gick fel vid tillämpning av CORS-fix.');
    };
    
    document.head.appendChild(script);
  }, []);

  const handleGoToTarget = () => {
    router.push(target);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-4">CORS Fixering</h1>
        
        <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-6">
          <p>{status}</p>
        </div>
        
        {isFixed && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              CORS-problemet har fixats temporärt. Nu kan du fortsätta navigera på sidan.
              För en permanent lösning, kontakta administratören.
            </p>
            
            <div className="border-t pt-4">
              <button
                onClick={handleGoToTarget}
                className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800"
              >
                Gå till webbplatsen
              </button>
            </div>
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Denna fix är temporär och kommer att återställas om du laddar om sidan.
        </p>
      </div>
    </div>
  );
} 