import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from "lucide-react";
import Link from 'next/link';

export default function HandbookOnboardingBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the banner has been dismissed
    const BANNER_KEY = 'handbook_onboarding_dismissed';
    const dismissed = typeof window !== 'undefined' && window.safeStorage 
      ? window.safeStorage.getItem(BANNER_KEY)
      : null;
    
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    const BANNER_KEY = 'handbook_onboarding_dismissed';
    if (typeof window !== 'undefined' && window.safeStorage) {
      window.safeStorage.setItem(BANNER_KEY, '1');
    }
  };

  if (!isVisible) return null;

  return (
    <Alert variant="info" className="mb-6 pr-12 relative">
      <AlertTitle className="text-lg">🎉 Välkommen till din digitala handbok!</AlertTitle>
      <AlertDescription>
        <div className="mt-2">
          Din handbok är nu klar och du kan börja redigera innehållet direkt.
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Klicka på <strong>Redigera</strong> för att anpassa sektioner och sidor.</li>
            <li>Bjud in styrelsemedlemmar eller boende under <strong>Användare</strong>.</li>
            <li>Behöver du hjälp? <Link href="/documentation" className="underline font-medium">Läs vår dokumentation</Link> eller <Link href="/contact" className="underline font-medium">kontakta supporten</Link>.</li>
          </ul>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={handleDismiss}
        aria-label="Stäng"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
} 