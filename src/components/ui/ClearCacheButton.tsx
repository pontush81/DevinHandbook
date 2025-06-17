'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2 } from 'lucide-react';

export function ClearCacheButton() {
  const clearAllCache = async () => {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear cookies (för denna domain)
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
      // Clear service worker cache om det finns
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      
      // Clear cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      alert('✅ Cache, cookies och storage rensad! Sidan laddas om...');
      
      // Force reload utan cache
      window.location.reload();
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('❌ Kunde inte rensa cache. Prova att ladda om sidan manuellt (Ctrl+Shift+R)');
    }
  };
  
  const forceReload = () => {
    // Force hard reload
    window.location.reload();
  };

  // Visa bara i development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <Button
        onClick={clearAllCache}
        variant="destructive"
        size="sm"
        className="shadow-lg"
        title="Rensa all cache, cookies och storage"
      >
        <Trash2 className="w-4 h-4 mr-1" />
        Rensa Cache
      </Button>
      
      <Button
        onClick={forceReload}
        variant="outline"
        size="sm"
        className="shadow-lg"
        title="Tvångsladdning (Ctrl+Shift+R)"
      >
        <RotateCcw className="w-4 h-4 mr-1" />
        Hard Reload
      </Button>
    </div>
  );
} 