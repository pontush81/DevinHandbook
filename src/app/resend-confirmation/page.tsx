"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MainLayout } from "@/components/layout/MainLayout";
import { AlertCircle, CheckCircle2, MailIcon } from "lucide-react";

export default function ResendConfirmationPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Use the resend method to send a new confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        }
      });

      if (error) {
        console.error('Resend error:', error);
        setError(`Kunde inte skicka bekräftelsemail: ${error.message}`);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError("Ett oväntat fel uppstod. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout variant="landing" showAuth={false} noWhiteTop={true} showHeader={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MailIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Skicka nytt bekräftelsemail
            </h1>
            <p className="text-gray-600">
              Ange din e-postadress så skickar vi ett nytt bekräftelsemail
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-900 mb-2">
                  Bekräftelsemail skickat!
                </h2>
                <p className="text-green-700 mb-4">
                  Ett nytt bekräftelsemail har skickats till <strong>{email}</strong>
                </p>
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-800">
                  <p className="font-medium mb-1">Nästa steg:</p>
                  <p>1. Kontrollera din e-post (även skräppost)</p>
                  <p>2. Klicka på bekräftelselänken</p>
                  <p>3. Logga in på ditt konto</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <a href="/login">Gå till inloggning</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-postadress
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ange din e-postadress"
                  className="w-full"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Skickar..." : "Skicka bekräftelsemail"}
              </Button>

              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Har du redan bekräftat din e-post?{" "}
                  <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    Logga in här
                  </a>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 