"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useHandbookStore } from "@/lib/store/handbook-store";

export function WizardStepOne({ showTabs = true }: { showTabs?: boolean }) {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { setCurrentStep, currentStep } = useHandbookStore();
  const [tab, setTab] = useState<"signup" | "login" | "reset">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  if (authLoading) {
    return <div className="text-center py-12">Laddar...</div>;
  }

  if (currentStep === 0 && user) {
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
            }}
          >
            Byt konto
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEmailAlreadyExists(false);
    setLoading(true);
    if (tab === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/create-handbook` : undefined,
        },
      });
      if (error) {
        if (
          error.code === "user_already_exists" ||
          error.code === "email_exists"
        ) {
          setEmailAlreadyExists(true);
          setError("E-postadressen är redan registrerad. Vill du logga in istället?");
        } else {
          setError(error.message);
        }
      } else if (!data.user && !data.session) {
        setRegistrationSuccess("Registrering pågår. Kontrollera din e-post för bekräftelse.");
        setTab("login");
        setSuccess(null);
      } else {
        setRegistrationSuccess("Registrering lyckades! Kontrollera din e-post för bekräftelse.");
        setTab("login");
        setSuccess(null);
      }
    } else if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Fel e-post eller lösenord.");
    } else if (tab === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/create-handbook` : undefined,
      });
      if (error) setError(error.message);
      else setSuccess("Återställningslänk skickad till din e-post.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-b-md border border-t-0 border-gray-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-blue-800 mb-1">E-post</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            placeholder="Ange din e-postadress"
            autoComplete="email"
          />
        </div>
        {tab !== "reset" && (
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-1">Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
              placeholder="Ange ditt lösenord"
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
            />
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm mt-2">
            {error}
            {emailAlreadyExists && (
              <div className="mt-2">
                <button
                  type="button"
                  className="text-blue-600 underline hover:text-blue-800 text-sm bg-transparent p-0 m-0 font-normal shadow-none w-auto cursor-pointer"
                  onClick={() => { setTab("login"); setError(null); setSuccess(null); setEmailAlreadyExists(false); }}
                >
                  Gå till inloggning
                </button>
              </div>
            )}
          </div>
        )}
        {success && <div className="text-green-700 text-sm mt-2">{success}</div>}
        {tab === "login" && registrationSuccess && (
          <div className="text-green-700 text-sm mb-2">{registrationSuccess}</div>
        )}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading}
        >
          {tab === "signup" && (loading ? "Skapar konto..." : "Skapa konto")}
          {tab === "login" && (loading ? "Loggar in..." : "Logga in")}
          {tab === "reset" && (loading ? "Skickar..." : "Skicka återställningslänk")}
        </button>
        {tab === "login" && (
          <div className="text-center mt-2">
            <a
              role="button"
              tabIndex={0}
              className="text-sm text-blue-600 underline bg-transparent p-0 m-0 font-normal shadow-none w-auto cursor-pointer hover:text-blue-800"
              onClick={e => { e.preventDefault(); setTab("reset"); setError(null); setSuccess(null); }}
            >
              Glömt lösenord?
            </a>
          </div>
        )}
      </form>
      <div className="text-center mt-4 flex flex-col gap-2">
        {tab === "signup" && (
          <a
            role="button"
            tabIndex={0}
            className="text-sm text-blue-600 underline bg-transparent p-0 m-0 font-normal shadow-none w-auto cursor-pointer hover:text-blue-800"
            onClick={e => { e.preventDefault(); setTab("login"); setError(null); setSuccess(null); }}
          >
            Har du redan ett konto? Logga in
          </a>
        )}
        {tab === "login" && (
          <a
            role="button"
            tabIndex={0}
            className="text-sm text-blue-600 underline bg-transparent p-0 m-0 font-normal shadow-none w-auto cursor-pointer hover:text-blue-800"
            onClick={e => { e.preventDefault(); setTab("signup"); setError(null); setSuccess(null); }}
          >
            Registrera konto
          </a>
        )}
        {tab === "reset" && (
          <a
            role="button"
            tabIndex={0}
            className="text-sm text-blue-600 underline bg-transparent p-0 m-0 font-normal shadow-none w-auto cursor-pointer hover:text-blue-800"
            onClick={e => { e.preventDefault(); setTab("login"); setError(null); setSuccess(null); }}
          >
            Tillbaka till inloggning
          </a>
        )}
      </div>
    </div>
  );
}
