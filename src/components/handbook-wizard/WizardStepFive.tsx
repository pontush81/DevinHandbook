"use client";

import React, { useState } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";

export function WizardStepFive() {
  const { name, subdomain, template } = useHandbookStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handbookData = {
    name,
    subdomain,
    template: {
      ...template,
      sections: template.sections
        .filter(section => section.isActive)
        .sort((a, b) => a.order - b.order)
    }
  };
  
  React.useEffect(() => {
    console.log("Complete handbook data:", handbookData);
  }, [handbookData]);
  
  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handbookData }),
      });
      
      const data = await response.json();
      
      if (!data.sessionUrl) {
        throw new Error('Failed to create checkout session');
      }
      
      window.location.href = data.sessionUrl;
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setError('Det gick inte att skapa betalsessionen. Försök igen senare.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Slutför och betala</h2>
        <p className="text-gray-500">
          Din handbok är redo att publiceras. Klicka på knappen nedan för att slutföra betalningen.
        </p>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg border">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Digital handbok för {name}</span>
            <span>995 kr</span>
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
            <span>995 kr</span>
          </div>
        </div>
        
        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
        
        <button 
          className="w-full mt-6 bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCheckout}
          disabled={isLoading}
        >
          {isLoading ? 'Förbereder betalning...' : 'Gå vidare till betalning'}
        </button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Efter betalning kommer din handbok att vara tillgänglig på{" "}
          <span className="font-medium">https://{subdomain}.handbok.org</span>
        </p>
      </div>
    </div>
  );
}
