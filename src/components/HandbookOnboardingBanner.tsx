import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from "lucide-react";
import Link from 'next/link';

const BANNER_KEY = 'handbook_onboarding_banner_dismissed';

export default function HandbookOnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Visa bannern bara om den inte är stängd tidigare
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(BANNER_KEY);
      setVisible(!dismissed);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BANNER_KEY, '1');
    }
  };

  if (!visible) return null;

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
        onClick={handleClose}
        aria-label="Stäng"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
} 