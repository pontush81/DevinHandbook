"use client";

import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Skapa konto</h2>
        <WizardStepOne showTabs={true} />
      </div>
    </div>
  );
}
