'use client';

import { useState, useEffect } from 'react';
import { usePWA } from './PWAPrompt';

export function PWATest() {
  const { isInstalled, isStandalone } = usePWA();
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<string>('Kontrollerar...');
  const [cacheStatus, setCacheStatus] = useState<string>('Kontrollerar...');

  useEffect(() => {
    // Kontrollera service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('✅ Service Worker aktiv');
      }).catch(() => {
        setServiceWorkerStatus('❌ Service Worker misslyckades');
      });

      // Kontrollera om vi har cache
      if ('caches' in window) {
        caches.keys().then(names => {
          const hasCache = names.some(name => name.includes('handbok-pwa'));
          setCacheStatus(hasCache ? '✅ Cache aktiv' : '⚠️ Cache inte aktiv än');
        });
      } else {
        setCacheStatus('❌ Cache inte stödd');
      }
    } else {
      setServiceWorkerStatus('❌ Service Worker inte stödd');
    }
  }, []);

  const testOffline = () => {
    // Försök hämta en cachad resurs
    fetch('/manifest.json')
      .then(response => {
        if (response.ok) {
          alert('✅ Offline-test lyckades! Resurser laddas från cache.');
        } else {
          alert('⚠️ Offline-test misslyckades. Kontrollera nätverket.');
        }
      })
      .catch(() => {
        alert('⚠️ Offline-test misslyckades. Appen är inte helt redo för offline-användning än.');
      });
  };

  const clearCache = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
      setCacheStatus('🗑️ Cache rensad');
      alert('Cache rensad! Ladda om sidan för att börja om.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">PWA Status</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">App installerad:</span>
          <span className={`text-sm font-medium ${isInstalled ? 'text-green-600' : 'text-gray-500'}`}>
            {isInstalled ? '✅ Ja' : '❌ Nej'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Standalone-läge:</span>
          <span className={`text-sm font-medium ${isStandalone ? 'text-green-600' : 'text-gray-500'}`}>
            {isStandalone ? '✅ Ja' : '❌ Nej'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Service Worker:</span>
          <span className="text-sm font-medium">{serviceWorkerStatus}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Cache:</span>
          <span className="text-sm font-medium">{cacheStatus}</span>
        </div>
      </div>
      
      <div className="mt-6 space-y-2">
        <button
          onClick={testOffline}
          className="w-full bg-blue-600 text-white text-sm py-2 px-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Testa Offline-funktionalitet
        </button>
        
        <button
          onClick={clearCache}
          className="w-full bg-gray-600 text-white text-sm py-2 px-3 rounded-md hover:bg-gray-700 transition-colors"
        >
          Rensa Cache
        </button>
      </div>
      
      {isStandalone && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            🎉 Du kör appen i standalone-läge! PWA fungerar perfekt.
          </p>
        </div>
      )}
    </div>
  );
} 