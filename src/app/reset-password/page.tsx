"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage(
          "Instruktioner för att återställa lösenordet har skickats till din e-post."
        );
        setEmail("");
      }
    } catch (err: any) {
      setError(err.message || "Ett fel uppstod vid återställning av lösenord");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">Handbok.org</h1>
          </Link>
          <p className="mt-2 text-gray-600">Återställ ditt lösenord</p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Återställ lösenord</h2>
          
          {successMessage ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 text-green-600 rounded-md">
                {successMessage}
              </div>
              <div className="text-center">
                <Link href="/login" className="text-black hover:underline">
                  Tillbaka till inloggning
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-post
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Skickar..." : "Skicka återställningslänk"}
                </button>
              </div>

              <div className="text-sm text-center">
                <Link href="/login" className="text-black hover:underline">
                  Tillbaka till inloggning
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
