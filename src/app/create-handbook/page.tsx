"use client";

import React from "react";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";
import { WizardStepTwo } from "@/components/handbook-wizard/WizardStepTwo";
import { WizardStepThree } from "@/components/handbook-wizard/WizardStepThree";
import { WizardStepFour } from "@/components/handbook-wizard/WizardStepFour";
import { WizardStepFive } from "@/components/handbook-wizard/WizardStepFive";
import { WizardNavigation } from "@/components/handbook-wizard/WizardNavigation";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateHandbook() {
  const { user, isLoading } = useAuth();
  const { currentStep } = useHandbookStore();
  
  // Visa loader om auth-status är oklar
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div>Laddar...</div></div>;
  }

  // Redirecta till login om användaren inte är inloggad
  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WizardStepOne showTabs={false} />;
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
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-2">
      <main className="w-full max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-12 flex flex-col gap-8 shadow-none border border-gray-100">
        <div className="mb-2 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Skapa digital handbok</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Följ stegen nedan för att skapa en skräddarsydd digital handbok för din förening.</p>
        </div>
        <div className="w-full flex flex-col gap-8">
          {renderStep()}
          <WizardNavigation totalSteps={5} />
        </div>
      </main>
    </div>
  );
}
