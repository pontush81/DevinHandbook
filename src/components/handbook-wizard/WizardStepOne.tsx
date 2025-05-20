"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useHandbookStore } from "@/lib/store/handbook-store";

export function WizardStepOne({ showTabs = true }: { showTabs?: boolean }) {
  const { user, isLoading, signOut } = useAuth();
  const { setCurrentStep } = useHandbookStore();
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return <div className="text-center py-12">Laddar...</div>;
  }

  if (user && !showForm) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold">Du är inloggad</h2>
        <p className="text-gray-600 mb-4">Du är inloggad som <span className="font-semibold">{user.email}</span>.</p>
        <div className="flex flex-col gap-2 items-center">
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition"
            onClick={() => setCurrentStep(1)}
          >
            Gå vidare
          </button>
          <button
            className="text-sm text-blue-600 underline mt-2"
            onClick={async () => {
              await signOut();
              setShowForm(true);
            }}
          >
            Byt konto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {showTabs && (
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
      )}
      <div className="bg-white p-6 rounded-b-md border border-t-0 border-gray-200 shadow-sm">
        {tab === "signup" ? (
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                brand: '#2563eb',
                brandAccent: '#1d4ed8',
                brandButtonText: '#fff'
              }
            }}
            providers={[]}
            view="sign_up"
            localization={{
              variables: {
                sign_up: {
                  email_label: "E-post",
                  password_label: "Lösenord",
                  button_label: "Skapa konto",
                  link_text: "Har du redan ett konto? Logga in"
                },
                sign_in: {
                  email_label: "E-post",
                  password_label: "Lösenord",
                  button_label: "Logga in",
                  link_text: "Har du inget konto? Skapa konto"
                },
                forgotten_password: {
                  email_label: "E-post",
                  button_label: "Skicka återställningslänk",
                  link_text: "Tillbaka till inloggning"
                }
              }
            }}
          />
        ) : (
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                brand: '#2563eb',
                brandAccent: '#1d4ed8',
                brandButtonText: '#fff'
              }
            }}
            providers={[]}
            view="sign_in"
            localization={{
              variables: {
                sign_in: {
                  email_label: "E-post",
                  password_label: "Lösenord",
                  button_label: "Logga in",
                  link_text: "Har du inget konto? Skapa konto"
                },
                sign_up: {
                  email_label: "E-post",
                  password_label: "Lösenord",
                  button_label: "Skapa konto",
                  link_text: "Har du redan ett konto? Logga in"
                },
                forgotten_password: {
                  email_label: "E-post",
                  button_label: "Skicka återställningslänk",
                  link_text: "Tillbaka till inloggning"
                }
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
