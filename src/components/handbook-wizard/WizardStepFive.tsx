"use client";

import React from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";

export function WizardStepFive() {
  const { name, subdomain, template } = useHandbookStore();
  
  React.useEffect(() => {
    console.log("Complete handbook data:", {
      name,
      subdomain,
      template: {
        ...template,
        sections: template.sections
          .filter(section => section.isActive)
          .sort((a, b) => a.order - b.order)
      }
    });
  }, [name, subdomain, template]);
  
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
        
        <button 
          className="w-full mt-6 bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800"
          onClick={() => alert("Stripe Checkout skulle ha startats här!")}
        >
          Gå vidare till betalning
        </button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Efter betalning kommer din handbok att vara tillgänglig på{" "}
          <span className="font-medium">https://{subdomain}.handbok.org</span>
        </p>
      </div>
    </div>
  );
}
