'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie, Settings } from 'lucide-react';
import Link from 'next/link';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Kontrollera om användaren redan har valt
    const consent = typeof window !== 'undefined' && localStorage
      ? localStorage.getItem('cookie_consent')
      : null;
    
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('cookie_consent', 'accepted');
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
    }
    setIsVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('cookie_consent', 'declined');
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
      
      // Rensa befintliga cookies (förutom nödvändiga)
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // Behåll endast absolut nödvändiga cookies
        if (!name.startsWith('__') && name !== 'cookie_consent') {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          if (window.location.hostname.includes('handbok.org')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.handbok.org`;
          }
        }
      });
    }
    setIsVisible(false);
    onDecline?.();
  };

  const handleSettings = () => {
    setShowDetails(!showDetails);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pb-4 sm:pb-6 bg-black/50 backdrop-blur-sm">
      <Card className="max-w-4xl mx-auto shadow-2xl border-2 bg-white">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <Cookie className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 flex-shrink-0 mt-1" />
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg mb-2">Vi använder cookies</h3>
              
              <p className="text-gray-600 text-sm sm:text-base mb-4">
                Vi använder cookies för att hantera inloggningssessioner och förbättra din upplevelse på vår webbplats. 
                Du kan välja att acceptera alla cookies eller endast nödvändiga cookies.
              </p>

              {showDetails && (
                <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm sm:text-base">Detaljerad information:</h4>
                  <ul className="text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2">
                    <li><strong>Nödvändiga cookies:</strong> Krävs för inloggning och grundläggande funktionalitet</li>
                    <li><strong>Funktionella cookies:</strong> Sparar dina preferenser (t.ex. sidebar-inställningar)</li>
                    <li><strong>Inga tracking-cookies:</strong> Vi använder inte cookies för marknadsföring eller spårning</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">
                    Läs mer i vår <Link href="/privacy" className="underline hover:text-blue-600">integritetspolicy</Link>.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button onClick={handleAccept} className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base">
                  Acceptera alla
                </Button>
                <Button onClick={handleDecline} variant="outline" className="text-sm sm:text-base">
                  Endast nödvändiga
                </Button>
                <Button onClick={handleSettings} variant="ghost" size="sm" className="text-xs sm:text-sm">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {showDetails ? 'Dölj' : 'Visa'} detaljer
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook för att kontrollera cookie consent
export function useCookieConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [consentType, setConsentType] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage) {
      const consent = localStorage.getItem('cookie_consent');
      if (consent) {
        setHasConsent(true);
        setConsentType(consent as 'accepted' | 'declined');
      } else {
        setHasConsent(false);
      }
    }
  }, []);

  const updateConsent = (type: 'accepted' | 'declined') => {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('cookie_consent', type);
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
      setHasConsent(true);
      setConsentType(type);
    }
  };

  return {
    hasConsent,
    consentType,
    updateConsent,
    canUseAnalytics: consentType === 'accepted',
    canUseFunctional: consentType === 'accepted'
  };
} 