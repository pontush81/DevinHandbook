"use client";

import React from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";

interface WizardNavigationProps {
  totalSteps: number;
}

export function WizardNavigation({ totalSteps }: WizardNavigationProps) {
  const { currentStep, setCurrentStep, name, subdomain } = useHandbookStore();
  
  const canGoNext = () => {
    if (currentStep === 0) {
      return name.trim() !== "" && subdomain.trim() !== "";
    }
    return true;
  };
  
  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const goToNextStep = () => {
    if (currentStep < totalSteps - 1 && canGoNext()) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Rendera nästa-knappen bara om vi inte är på sista steget
  const renderNextButton = () => {
    if (currentStep < totalSteps - 1) {
      return (
        <button
          onClick={goToNextStep}
          disabled={!canGoNext()}
          className={`px-4 py-2 rounded-md ${
            !canGoNext()
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          Nästa
        </button>
      );
    }
    
    // På sista steget visar vi en tom div istället
    return <div className="w-24"></div>;
  };
  
  // Generera stegindikatorerna
  const renderStepIndicators = () => {
    return Array(totalSteps)
      .fill(0)
      .map((_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full ${
            index === currentStep ? "bg-black" : "bg-gray-300"
          }`}
        />
      ));
  };
  
  return (
    <div className="flex justify-between mt-8">
      <button
        onClick={goToPrevStep}
        disabled={currentStep === 0}
        className={`px-4 py-2 rounded-md ${
          currentStep === 0
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
      >
        Föregående
      </button>
      
      <div className="flex items-center gap-1">
        {renderStepIndicators()}
      </div>
      
      {renderNextButton()}
    </div>
  );
}
