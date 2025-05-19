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
          <label htmlFor="name" className="text-sm font-medium text-blue-800">
            Föreningens namn
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Brf Solgården"
            className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          />
          {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="subdomain" className="text-sm font-medium text-blue-800">
            Subdomän
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
            <input
              id="subdomain"
              type="text"
              value={subdomain}
              onChange={handleSubdomainChange}
              placeholder="solgarden"
              className="flex-1 px-3 py-2 border border-blue-200 rounded-t-md sm:rounded-l-md sm:rounded-t-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            />
            <span className="px-3 py-2 bg-blue-50 border border-l-0 border-blue-200 rounded-b-md sm:rounded-r-md sm:rounded-b-none text-blue-700 text-sm">
              .handbok.org
            </span>
          </div>
          {subdomainError && <p className="text-red-500 text-sm">{subdomainError}</p>}
          <p className="text-blue-700 text-xs">
            Din handbok kommer att vara tillgänglig på https://{subdomain || "dinforening"}.handbok.org
          </p>
        </div>
      </div>
    </div>
  );
}
