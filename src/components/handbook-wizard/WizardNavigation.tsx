"use client";

import React from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  totalSteps: number;
}

export function WizardNavigation({ totalSteps }: WizardNavigationProps) {
  const { currentStep, setCurrentStep, name, subdomain } = useHandbookStore();
  const { user } = useAuth();
  
  // Visa inte navigationen på inloggningssteget
  if (currentStep === 0) {
    return null;
  }
  
  const canGoNext = () => {
    if (currentStep === 0) {
      return !!user;
    }
    if (currentStep === 1) {
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
          className={`px-4 py-2 rounded-md transition-colors duration-150 font-semibold shadow-sm
            ${!canGoNext()
              ? "bg-blue-100 text-blue-300 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-300"}
          `}
        >
          Nästa
        </button>
      );
    }
    return <div className="w-24"></div>;
  };
  
  // Generera stegindikatorerna
  const renderStepIndicators = () => {
    return Array(totalSteps)
      .fill(0)
      .map((_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-colors duration-150
            ${index === currentStep ? "bg-blue-600" : "bg-blue-100"}
          `}
        />
      ));
  };
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
      {currentStep > 0 ? (
        <Button
          onClick={goToPrevStep}
          className="px-4 py-2 rounded-md font-semibold transition-colors duration-150 shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-300"
        >
          Föregående
        </Button>
      ) : (
        <div className="w-24"></div>
      )}
      <div className="flex items-center gap-2">{renderStepIndicators()}</div>
      {(currentStep !== 0 || user) ? renderNextButton() : <div className="w-24"></div>}
    </div>
  );
}
