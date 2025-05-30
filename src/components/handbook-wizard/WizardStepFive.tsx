"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WizardStepFive() {
  const { name, subdomain, template } = useHandbookStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean | null>(null);
  const [price, setPrice] = useState<number>(2490); // Default pris i kr
  const [handbookCreated, setHandbookCreated] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<'idle' | 'preparing' | 'creating' | 'done'>('idle');
  
  const handbookData = useMemo(() => ({
    name,
    subdomain,
    template: {
      ...template,
      sections: template.sections
        .filter(section => section.isActive)
        .sort((a, b) => a.order - b.order)
    }
  }), [name, subdomain, template]);
  
  useEffect(() => {
    console.log("Complete handbook data:", handbookData);
  }, [handbookData]);
  
  // Hämta aktuellt prisbelopp från API
  useEffect(() => {
    async function fetchPrice() {
      try {
        const response = await fetch('/api/stripe/check-mode');
        const data = await response.json();
        setIsTestMode(data.isTestMode);
        
        // Hämta det faktiska prisbeloppet om det är tillgängligt
        if (data.priceAmount) {
          // Konvertera från öre till kronor för visning
          setPrice(data.priceAmount / 100);
        }
      } catch (err) {
        console.error('Error fetching stripe mode:', err);
      }
    }
    fetchPrice();
  }, []);
  
  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);
    setHandbookCreated(null);
    setProgressStep('preparing');
    try {
      // Lägg till loggning för att se exakt vad som skickas
      console.log("[Stripe Checkout] Skickar handbookData till backend:", handbookData);

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handbookData }),
      });
      
      if (!response.ok) {
        if (response.status === 409) {
          setError('Subdomänen är redan upptagen. Välj ett annat namn.');
        } else {
          setError('Det gick inte att skapa betalsessionen. Försök igen senare.');
        }
        setIsLoading(false);
        setProgressStep('idle');
        return;
      }
      
      const data = await response.json();
      
      // Om vi får success: true och handbookId men ingen url, så har vi hoppat över Stripe
      if (data.success && data.handbookId && !data.url) {
        setProgressStep('creating');
        setHandbookCreated(data.handbookId);
        setIsTestMode(true); // Visa testläge om vi hoppat över Stripe
        setIsLoading(false);
        return;
      }
      
      if (!data.url) {
        setProgressStep('idle');
        throw new Error('Failed to create checkout session');
      }
      
      // Uppdatera testlägesstatus från API-svaret
      setIsTestMode(data.isTestMode);
      
      window.location.href = data.url;
    } catch (err: unknown) {
      console.error('Error creating checkout session:', err);
      setError('Det gick inte att skapa betalsessionen. Försök igen senare.');
      setProgressStep('idle');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (handbookCreated) {
      setProgressStep('done');
      const timeout = setTimeout(() => {
        window.location.href = `https://${subdomain}.handbok.org`;
      }, 2000); // 2 sekunder
      return () => clearTimeout(timeout);
    }
  }, [handbookCreated, subdomain]);
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Slutför och betala</h2>
        <p className="text-gray-500">
          Din handbok är redo att publiceras. Klicka på knappen nedan för att slutföra betalningen.
        </p>
        {isTestMode === true && (
          <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-sm mt-2">
            🧪 Testläge aktivt - ingen faktisk betalning kommer att ske
          </div>
        )}
        {!isTestMode && price < 10 && (
          <div className="bg-blue-100 text-blue-800 p-2 rounded text-sm mt-2">
            ⚠️ OBS! Detta är ett minimalt testbelopp för verifiering av betalflödet ({price.toFixed(2)} kr)
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg border">
        {/* Visa lyckat meddelande om handboken skapats direkt utan Stripe */}
        {handbookCreated && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
            ✅ Handboken har skapats direkt i testläge!<br />
            <a
              href={`https://${subdomain}.handbok.org`}
              className="underline text-green-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gå till din handbok
            </a>
          </div>
        )}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Digital handbok för {name}</span>
            <span>{price.toFixed(2)} kr</span>
          </div>
          <div className="flex justify-between text-gray-500 text-sm">
            <span>Subdomän</span>
            <span>{subdomain}.handbok.org</span>
          </div>
          <div className="flex justify-between text-gray-500 text-sm">
            <span>Antal sektioner</span>
            <span>{template.sections.filter(s => s.isActive).length}</span>
          </div>
          <div className="border-t my-3"></div>
          <div className="flex justify-between font-semibold">
            <span>Totalt</span>
            <span>{price.toFixed(2)} kr</span>
          </div>
        </div>
        
        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
        
        {/* Progress/animation status */}
        {(progressStep === 'preparing' || progressStep === 'creating' || progressStep === 'done') && (
          <div className="mb-4 flex flex-col items-center justify-center gap-2">
            {progressStep === 'preparing' && (
              <>
                <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
                <span className="text-blue-700 text-sm">Förbereder betalning...</span>
              </>
            )}
            {progressStep === 'creating' && (
              <>
                <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
                <span className="text-blue-700 text-sm">Handboken skapas...</span>
              </>
            )}
            {progressStep === 'done' && (
              <>
                <CheckCircle2 className="text-green-600 w-8 h-8" />
                <span className="text-green-700 text-sm font-medium">Handboken klar! Du skickas vidare...</span>
              </>
            )}
          </div>
        )}
        
        <Button 
          className="w-full mt-6 bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCheckout}
          disabled={isLoading || !!handbookCreated || progressStep !== 'idle'}
        >
          {isLoading ? 'Förbereder betalning...' : 'Gå vidare till betalning'}
        </Button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Efter betalning kommer din handbok att vara tillgänglig på{" "}
          <span className="font-medium">https://{subdomain}.handbok.org</span>
        </p>
        
        {isTestMode === true && (
          <p className="text-xs bg-yellow-50 p-2 rounded mt-2 text-yellow-700">
            I testläge kan du använda kortnummer <strong>4242 4242 4242 4242</strong> med valfritt 
            framtida utgångsdatum, CVC och postnummer för att simulera en lyckad betalning.
          </p>
        )}
      </div>
    </div>
  );
}
