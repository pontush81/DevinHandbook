'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ClearCacheButton() {
  const clearAllCache = () => {
    // Rensa localStorage säkert
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn('Could not remove localStorage item:', key);
          }
        });
        console.log('LocalStorage cleared');
      } catch (e) {
        console.warn('Could not access localStorage');
      }
    }

    // Rensa cookies
    if (typeof document !== 'undefined') {
      try {
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
        console.log('Cookies cleared');
      } catch (e) {
        console.warn('Could not clear cookies');
      }
    }

    // Rensa PWA cache via service worker
    if (typeof window !== 'undefined' && 'clearPWACache' in window) {
      try {
        (window as any).clearPWACache();
        return; // clearPWACache kommer att ladda om sidan
      } catch (e) {
        console.warn('Could not clear PWA cache');
      }
    }

    // Fallback - ladda om sidan
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const clearPWACacheOnly = () => {
    if (typeof window !== 'undefined' && 'clearPWACache' in window) {
      (window as any).clearPWACache();
    } else {
      alert('PWA cache clearing inte tillgänglig');
    }
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
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Rensa All Cache
      </Button>
      
      <Button
        onClick={clearPWACacheOnly}
        variant="outline"
        size="sm"
        className="shadow-lg bg-white"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Rensa PWA Cache
      </Button>
    </div>
  );
} 