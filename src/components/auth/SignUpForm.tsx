"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from "@/lib/supabase";
import { InfoIcon, CheckCircle2, MailIcon } from "lucide-react";

export function SignUpForm({ showLoginLink = true }: { showLoginLink?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken långt");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      
      if (error) {
        if (error.code === "user_already_exists" || error.code === "email_exists") {
          setError("E-postadressen är redan registrerad. Vill du logga in istället?");
        } else {
          setError(error.message);
        }
      } else if (!data.user && !data.session) {
        setSuccessMessage(
          "Registrering lyckades! Ett bekräftelsemail har skickats till din e-postadress. " +
          "VIKTIGT: Du måste klicka på länken i mailet för att aktivera ditt konto innan du kan logga in. " +
          "Du omdirigeras till inloggningssidan..."
        );
        
        // Efter 3 sekunder, omdirigera till inloggningssidan med information om e-postverifiering
        setTimeout(() => {
          router.push("/login?registration=success");
        }, 3000);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod vid registrering");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-gray-200 shadow-lg space-y-5">
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-md mb-4">
          <div className="flex items-start gap-2">
            <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Viktig information:</p>
              <p>När du skapar ett konto måste du bekräfta din e-postadress genom att klicka på länken i bekräftelsemailet som skickas till dig.</p>
            </div>
          </div>
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-post
          </label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ange din e-postadress"
            autoComplete="email"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Lösenord
          </label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ange ditt lösenord"
            autoComplete="new-password"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Bekräfta lösenord
          </label>
          <Input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Bekräfta ditt lösenord"
            autoComplete="new-password"
            className="w-full"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-md flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-green-700 font-medium">Registrering lyckades!</span>
            </div>
            
            <div className="flex items-start gap-2 mt-1">
              <MailIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Ett bekräftelsemail har skickats till din e-postadress.</p>
                <p className="mt-1">
                  <span className="font-bold text-red-600">VIKTIGT:</span> Du måste klicka på länken i mailet 
                  för att aktivera ditt konto innan du kan logga in.
                </p>
                <p className="mt-1 italic">Du omdirigeras till inloggningssidan...</p>
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Skapar konto..." : "Skapa konto"}
        </Button>
      </form>

      {showLoginLink && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Har du redan ett konto?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Logga in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
