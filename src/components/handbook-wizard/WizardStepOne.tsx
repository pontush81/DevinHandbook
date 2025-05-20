"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useHandbookStore } from "@/lib/store/handbook-store";

export function WizardStepOne() {
  const { user, isLoading } = useAuth();
  const { setCurrentStep } = useHandbookStore();
  const [tab, setTab] = useState<"signup" | "login">("signup");

  if (isLoading) {
    return <div className="text-center py-12">Laddar...</div>;
  }

  if (user) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold">Du är inloggad</h2>
        <p className="text-gray-600 mb-4">Du är inloggad som <span className="font-semibold">{user.email}</span>.</p>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition"
          onClick={() => setCurrentStep(1)}
        >
          Gå vidare
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex justify-center gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded-t-md font-semibold border-b-2 transition-colors duration-150 ${tab === "signup" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-blue-600"}`}
          onClick={() => setTab("signup")}
        >
          Skapa konto
        </button>
        <button
          className={`px-4 py-2 rounded-t-md font-semibold border-b-2 transition-colors duration-150 ${tab === "login" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-blue-600"}`}
          onClick={() => setTab("login")}
        >
          Logga in
        </button>
      </div>
      <div className="bg-white p-6 rounded-b-md border border-t-0 border-gray-200 shadow-sm">
        {tab === "signup" ? <SignUpForm /> : <SignInForm />}
      </div>
    </div>
  );
}
