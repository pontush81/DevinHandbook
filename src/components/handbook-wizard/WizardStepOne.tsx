"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useHandbookStore } from "@/lib/store/handbook-store";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';

export function WizardStepOne({ showTabs = true, tab: propTab, setTab: propSetTab }: { showTabs?: boolean, tab?: 'signup' | 'login' | 'reset', setTab?: (tab: 'signup' | 'login' | 'reset') => void }) {
  const { user, isLoading: authLoading } = useAuth();
  const { setCurrentStep, currentStep } = useHandbookStore();
  const [internalTab, internalSetTab] = useState<'signup' | 'login' | 'reset'>('signup');
  const tab = propTab ?? internalTab;
  const setTab = propSetTab ?? internalSetTab;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const router = useRouter();

  if (authLoading) {
    return <div className="text-center py-4">Laddar...</div>;
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
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
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
      else router.push("/dashboard");
    } else if (tab === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      });
      if (error) setError(error.message);
      else setSuccess("Återställningslänk skickad till din e-post.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-gray-200 shadow-lg space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Ange din e-postadress"
            autoComplete="email"
          />
        </div>
        {tab !== "reset" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Ange ditt lösenord"
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
            />
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
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
        {success && <div className="text-green-700 text-sm p-3 bg-green-50 rounded-md">{success}</div>}
        {tab === "login" && registrationSuccess && (
          <div className="text-green-700 text-sm p-3 bg-green-50 rounded-md">{registrationSuccess}</div>
        )}
        <Button
          type="submit"
          className="w-full py-3 px-4 rounded-md font-semibold transition disabled:opacity-50"
          disabled={loading}
        >
          {tab === "signup" && (loading ? "Skapar konto..." : "Skapa konto")}
          {tab === "login" && (loading ? "Loggar in..." : "Logga in")}
          {tab === "reset" && (loading ? "Skickar..." : "Skicka återställningslänk")}
        </Button>
        {tab === "login" && (
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="text-sm"
              onClick={e => { setTab("reset"); setError(null); setSuccess(null); }}
            >
              Glömt lösenord?
            </Button>
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
            Har du inget konto? Registrera konto
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
