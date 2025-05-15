"use client";

import React, { useState, useEffect, useRef } from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { createSubdomainFromName } from "@/lib/utils";

export function WizardStepOne() {
  const { name, subdomain, setName, setSubdomain } = useHandbookStore();
  const [nameError, setNameError] = useState("");
  const [subdomainError, setSubdomainError] = useState("");
  const [subdomainManuallyEdited, setSubdomainManuallyEdited] = useState(false);
  const initialRender = useRef(true);
  
  const validateSubdomain = (value: string) => {
    if (!value) {
      setSubdomainError("Subdomän krävs");
      return false;
    }
    
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(value)) {
      setSubdomainError("Subdomän får endast innehålla små bokstäver, siffror och bindestreck. Den får inte börja eller sluta med bindestreck.");
      return false;
    }
    
    setSubdomainError("");
    return true;
  };
  
  const validateName = (value: string) => {
    if (!value) {
      setNameError("Föreningens namn krävs");
      return false;
    }
    
    setNameError("");
    return true;
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    validateName(value);
  };
  
  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSubdomain(value);
    setSubdomainManuallyEdited(true);
    validateSubdomain(value);
  };
  
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    
    if (name && !subdomainManuallyEdited) {
      const suggestedSubdomain = createSubdomainFromName(name);
      setSubdomain(suggestedSubdomain);
    }
  }, [name, setSubdomain, subdomainManuallyEdited]);
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Skapa din förenings digitala handbok</h2>
        <p className="text-gray-500">
          Börja med att ange din förenings namn och välj en subdomän för din handbok.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Föreningens namn
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Brf Solgården"
            className="w-full px-3 py-2 border rounded-md"
          />
          {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="subdomain" className="text-sm font-medium">
            Subdomän
          </label>
          <div className="flex items-center">
            <input
              id="subdomain"
              type="text"
              value={subdomain}
              onChange={handleSubdomainChange}
              placeholder="solgarden"
              className="flex-1 px-3 py-2 border rounded-l-md"
            />
            <span className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-gray-500">
              .handbok.org
            </span>
          </div>
          {subdomainError && <p className="text-red-500 text-sm">{subdomainError}</p>}
          <p className="text-gray-500 text-sm">
            Din handbok kommer att vara tillgänglig på https://{subdomain || "dinforening"}.handbok.org
          </p>
        </div>
      </div>
    </div>
  );
}
