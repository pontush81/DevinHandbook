"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SignInForm({ showSignupLink = true }: { showSignupLink?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod vid inloggning");
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

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center"
          >
            {isLoading ? "Loggar in..." : "Logga in"}
          </Button>
        </div>

        {showSignupLink && (
          <div className="text-sm text-center">
            Har du inget konto?{" "}
            <Link href="/register" className="text-black hover:underline">
              Skapa konto
            </Link>
          </div>
        )}
        <div className="text-sm text-center">
          <Link href="/reset-password" className="text-black hover:underline">
            Glömt lösenord?
          </Link>
        </div>
      </form>
    </div>
  );
}
