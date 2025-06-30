'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Share, Home } from 'lucide-react';

interface InstallPromptProps {
  handbookTitle?: string;
}

// Säker localStorage implementation
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Fail silently
    }
  }
};

export default function InstallPrompt({ handbookTitle = "Handbok" }: InstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstructions, setIsInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Säkerställ att vi är i browser-miljö
    if (typeof window === 'undefined') return;

    // Kontrollera om det är iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Kontrollera om det är Safari (inte Chrome eller annan iOS-browser)
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Kontrollera om appen redan körs i standalone mode (installerad)
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;

    setIsIOS(isIOSDevice);
    setIsSafari(isSafariBrowser);
    setIsStandalone(isInStandalone);

    // Visa endast om:
    // 1. Det är iOS
    // 2. Det är Safari
    // 3. Appen inte redan är installerad
    // 4. Användaren inte har stängt av prompten tidigare
    const hasBeenDismissed = safeStorage.getItem('install-prompt-dismissed') === 'true';
    
    if (isIOSDevice && isSafariBrowser && !isInStandalone && !hasBeenDismissed) {
      // Vänta lite innan vi visar prompten för att inte störa användarupplevelsen
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Öka till 3 sekunder för mindre intrusive
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    safeStorage.setItem('install-prompt-dismissed', 'true');
  };

  const handleShowInstructions = () => {
    setIsInstructions(true);
  };

  const handleCloseInstructions = () => {
    setIsInstructions(false);
  };

  // Visa inte komponenten om villkoren inte är uppfyllda
  if (!isVisible || !isIOS || !isSafari || isStandalone) {
    return null;
  }

  return (
    <>
      {/* Install Prompt Banner */}
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-blue-600 text-white rounded-lg shadow-lg p-4 border border-blue-500 transition-all duration-300 ease-out">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
            <Home className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Installera {handbookTitle}
            </h3>
            <p className="text-xs text-blue-100 mb-3">
              Lägg till på hemskärmen för snabb åtkomst och offline-användning
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleShowInstructions}
                className="bg-white text-blue-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                Visa hur
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-100 px-3 py-1.5 text-xs hover:text-white transition-colors"
              >
                Inte nu
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white transition-colors flex-shrink-0"
            aria-label="Stäng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Instructions Modal */}
      {isInstructions && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 transition-opacity duration-200">
          <div className="bg-white rounded-lg max-w-sm w-full max-h-[80vh] overflow-y-auto transform transition-all duration-200 scale-100">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Lägg till på hemskärmen
              </h3>
              <button
                onClick={handleCloseInstructions}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Stäng instruktioner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Följ dessa steg för att installera {handbookTitle} på din hemskärm:
              </div>
              
              {/* Steg 1 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Share className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Tryck på delnings-ikonen
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Titta efter delnings-ikonen längst ner i Safari (rutan med pilen uppåt)
                  </p>
                </div>
              </div>

              {/* Steg 2 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Välj "Lägg till på hemskärmen"
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Scrolla ner i menyn och tryck på "Lägg till på hemskärmen"
                  </p>
                </div>
              </div>

              {/* Steg 3 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Bekräfta installationen
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Tryck på "Lägg till" för att skapa en app-ikon på hemskärmen
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-green-800">
                  <strong>Tips:</strong> Efter installation kan du öppna {handbookTitle} direkt från hemskärmen, även utan internetanslutning!
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={handleCloseInstructions}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Förstått!
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800 transition-colors"
              >
                Visa inte igen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 