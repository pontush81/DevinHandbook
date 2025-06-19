'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone, Download } from 'lucide-react';

interface PWAPromptProps {
  onClose?: () => void;
}

export function PWAPrompt({ onClose }: PWAPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Kontrollera om appen redan är installerad
    const checkInstallStatus = () => {
      // Kontrollera om vi kör i standalone-läge
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
      
      setIsStandalone(standalone);
      
      // Om vi redan kör som app, visa inte prompt
      if (standalone) {
        setIsInstalled(true);
        return;
      }

      // Kontrollera om användaren tidigare avvisat prompten
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      const lastShown = localStorage.getItem('pwa-prompt-last-shown');
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;

      // Visa inte igen om avvisat inom senaste 7 dagarna
      if (dismissed && (now - parseInt(dismissed)) < (7 * dayInMs)) {
        return;
      }

      // Visa inte igen om visad inom senaste dag
      if (lastShown && (now - parseInt(lastShown)) < dayInMs) {
        return;
      }

      // Vänta lite innan vi visar prompten
      setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('pwa-prompt-last-shown', now.toString());
      }, 3000);
    };

    // Lyssna på beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      checkInstallStatus();
    };

    // Lyssna på app-installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA: App installerad framgångsrikt!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check
    checkInstallStatus();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      const { outcome } = await deferredPrompt.prompt();
      
      if (outcome === 'accepted') {
        console.log('PWA: Användaren accepterade installation');
        setIsInstalled(true);
      } else {
        console.log('PWA: Användaren avvisade installation');
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
      }
      
      setShowPrompt(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('PWA: Fel vid installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    onClose?.();
  };

  // Visa inte om redan installerad eller i standalone-läge
  if (isInstalled || isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <Smartphone className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Installera Handbok</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Stäng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Få snabb tillgång till din handbok direkt från hemskärmen. 
          Fungerar offline och laddar snabbare!
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Installera
          </button>
          <button
            onClick={handleDismiss}
            className="text-sm text-gray-600 py-2 px-3 hover:text-gray-800 transition-colors"
          >
            Senare
          </button>
        </div>
        
        {/* Manual installation instructions for iOS/other browsers */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            <strong>iOS:</strong> Tryck på <span className="inline-block w-3 h-3 mx-1">⎦</span> och välj "Lägg till på hemskärmen"
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook för att använda PWA-status i andra komponenter
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone ||
                     document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);
    setIsInstalled(standalone);
  }, []);

  return { isInstalled, isStandalone };
} 