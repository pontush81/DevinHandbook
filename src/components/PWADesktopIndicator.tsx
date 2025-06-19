'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { universalStorage } from '@/lib/safe-storage';

export function PWADesktopIndicator() {
  const [showIndicator, setShowIndicator] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Kontrollera om det är desktop
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) &&
                      !window.matchMedia('(max-width: 768px)').matches;
    
    if (!isDesktop) return;

    // Kontrollera om redan installerad
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone;
    
    if (isStandalone) return;

    // Kontrollera om användaren redan avvisat desktop-indikatorn
    const dismissed = universalStorage.getItem('pwa-desktop-indicator-dismissed');
    if (dismissed) return;

    // Lyssna på installation-event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Visa diskret indikator efter en längre delay för desktop
      setTimeout(() => {
        setShowIndicator(true);
      }, 10000); // 10 sekunder delay
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      const { outcome } = await deferredPrompt.prompt();
      
      if (outcome === 'accepted') {
        console.log('PWA: Desktop-användaren installerade appen');
      }
      
      setShowIndicator(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('PWA: Fel vid desktop-installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowIndicator(false);
    universalStorage.setItem('pwa-desktop-indicator-dismissed', 'true');
  };

  if (!showIndicator) return null;

  return (
    <div className="fixed top-4 right-4 z-40 max-w-xs">
      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-gray-900">Installera som app</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Stäng"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-3">
          Få snabbare åtkomst och offline-funktionalitet.
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            Installera
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
          >
            Nej tack
          </button>
        </div>
      </div>
    </div>
  );
} 