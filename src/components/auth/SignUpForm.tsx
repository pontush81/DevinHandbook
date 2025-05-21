"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SignUpForm({ showLoginLink = true }: { showLoginLink?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signUp } = useAuth();
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
      const { error, data } = await signUp(email, password);
      
      if (error) {
        setError(error.message);
      } else if (data) {
        router.push("/dashboard");
      } else {
        setSuccessMessage(
          "Registrering lyckades! Kontrollera din e-post för att bekräfta ditt konto."
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod vid registrering");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-post
          </label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Lösenord
          </label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Bekräfta lösenord
          </label>
          <Input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

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

        <div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center"
          >
            {isLoading ? "Skapar konto..." : "Skapa konto"}
          </Button>
        </div>

        {showLoginLink && (
          <div className="text-sm text-center">
            Har du redan ett konto?{" "}
            <Link href="/login" className="text-black hover:underline">
              Logga in
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
