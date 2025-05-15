"use client";

import React from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";
import { WizardStepTwo } from "@/components/handbook-wizard/WizardStepTwo";
import { WizardStepThree } from "@/components/handbook-wizard/WizardStepThree";
import { WizardStepFour } from "@/components/handbook-wizard/WizardStepFour";
import { WizardStepFive } from "@/components/handbook-wizard/WizardStepFive";
import { WizardNavigation } from "@/components/handbook-wizard/WizardNavigation";

export default function CreateHandbook() {
  const { currentStep } = useHandbookStore();
  
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WizardStepOne />;
      case 1:
        return <WizardStepTwo />;
      case 2:
        return <WizardStepThree />;
      case 3:
        return <WizardStepFour />;
      case 4:
        return <WizardStepFive />;
      default:
        return <WizardStepOne />;
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Skapa digital handbok</h1>
        <p className="text-gray-500 mt-2">
          Följ stegen nedan för att skapa en skräddarsydd digital handbok för din bostadsrättsförening.
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        {renderStep()}
        <WizardNavigation totalSteps={5} />
      </div>
    </div>
  );
}
