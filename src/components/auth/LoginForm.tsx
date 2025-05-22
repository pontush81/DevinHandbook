"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from "@/lib/supabase";

export function LoginForm({ showSignupLink = true }: { showSignupLink?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (resetMode) {
        // Lösenordsåterställning
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        });
        
        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage("Återställningslänk skickad till din e-post.");
        }
      } else {
        // Vanlig inloggning
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (error) {
          setError("Fel e-post eller lösenord.");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod vid inloggning");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-gray-200 shadow-lg space-y-5">
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

        {!resetMode && (
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
              autoComplete="current-password"
              className="w-full"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading 
            ? (resetMode ? "Skickar..." : "Loggar in...")
            : (resetMode ? "Skicka återställningslänk" : "Logga in")
          }
        </Button>

        <div className="text-center">
          <Button
            type="button"
            variant="link"
            className="text-sm"
            onClick={() => {
              setResetMode(!resetMode);
              setError(null);
              setSuccessMessage(null);
            }}
          >
            {resetMode ? "Tillbaka till inloggning" : "Glömt lösenord?"}
          </Button>
        </div>
      </form>

      {showSignupLink && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Har du inget konto?{" "}
            <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Registrera konto
            </Link>
          </p>
        </div>
      )}
    </div>
  );
} 