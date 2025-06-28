"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from "@/lib/supabase";
import { smartRedirectWithPolling } from '@/lib/redirect-utils';
import { User } from "@supabase/supabase-js";
import { GoogleLoginButton } from './GoogleLoginButton';

interface LoginFormProps {
  showSignupLink?: boolean;
  onSuccess?: (user: User) => void;
  joinCode?: string | null;
}

export function LoginForm({ showSignupLink = true, onSuccess, joinCode }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowResendButton(false);
    setShowForgotPassword(false);

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
        console.log("Försöker logga in med:", { email, passwordLength: password.length });
        
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        console.log("Inloggningsresultat:", { 
          success: !error, 
          errorMessage: error?.message,
          errorCode: error?.code,
          hasUser: !!data?.user,
          hasSession: !!data?.session,
          sessionExpiry: data?.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'none'
        });
        
        if (error) {
          // Specifik felhantering för obekräftad e-post
          if (error.message.toLowerCase().includes("email not confirmed") || 
              error.message.toLowerCase().includes("email is not confirmed") ||
              error.message.toLowerCase().includes("not confirmed") ||
              error.message.toLowerCase().includes("email_not_confirmed") ||
              error.message.toLowerCase().includes("signup requires email confirmation") ||
              error.code === "email_not_confirmed" ||
              error.code === "401" || 
              error.code === "422") {
            setError(
              "Din e-postadress har inte bekräftats än. Du måste klicka på länken i bekräftelsemailet som skickades " +
              "när du registrerade dig för att aktivera ditt konto."
            );
            setShowResendButton(true);
          } else if (error.message.toLowerCase().includes("invalid login credentials") ||
                     error.message.toLowerCase().includes("invalid credentials") ||
                     error.message.toLowerCase().includes("invalid email or password") ||
                     error.message.toLowerCase().includes("wrong password") ||
                     error.message.toLowerCase().includes("incorrect password") ||
                     error.code === "invalid_credentials") {
            setError(
              "E-postadressen eller lösenordet stämmer inte. Kontrollera att du har stavat rätt och försök igen. " +
              "Kom ihåg att lösenord är skiftlägeskänsliga."
            );
            setShowResendButton(false);
            setShowForgotPassword(true);
          } else if (error.message.toLowerCase().includes("anslutningsfel") ||
                     error.message.toLowerCase().includes("kunde inte ansluta") ||
                     error.message.toLowerCase().includes("network") ||
                     error.message.toLowerCase().includes("fetch failed") ||
                     error.message.toLowerCase().includes("connection") ||
                     (error.message.toLowerCase().includes("fetch") && !error.message.toLowerCase().includes("credentials"))) {
            setError(
              "Det verkar vara problem med internetanslutningen. Kontrollera att du är ansluten till internet och försök igen. " +
              "Om problemet kvarstår, försök ladda om sidan."
            );
          } else {
            // För okända fel, logga dem för debugging och visa ett generiskt meddelande
            console.error("Okänt inloggningsfel:", error);
            setError(`Fel vid inloggning: ${error.message}${error.code ? ` (Kod: ${error.code})` : ''}`);
          }
        } else if (!data.session) {
          setError("Kunde inte skapa en aktiv session. Försök igen eller kontakta support.");
        } else {
          // Inloggning lyckades
          console.log("Inloggning lyckades, förbereder omdirigering...");
          
          // If there's a join code and onSuccess callback, use that
          if (onSuccess && data.user) {
            onSuccess(data.user);
            return;
          }
          
          // Kontrollera om det finns en return URL från session renewal eller redirect parameter
          const urlParams = new URLSearchParams(window.location.search);
          const returnUrl = urlParams.get('return');
          const redirectUrl = urlParams.get('redirect');
          
          if (returnUrl) {
            console.log("Omdirigerar till return URL:", returnUrl);
            // Återgå till där användaren var innan session renewal
            setTimeout(() => {
              window.location.href = decodeURIComponent(returnUrl);
            }, 1000);
          } else if (redirectUrl) {
            console.log("Omdirigerar till redirect URL:", redirectUrl);
            // Redirect to the intended page
            setTimeout(() => {
              window.location.href = decodeURIComponent(redirectUrl);
            }, 1000);
          } else {
            // Use smart redirect with polling to ensure session is properly established
            setTimeout(() => {
              smartRedirectWithPolling(5, 800);
            }, 1000);
          }
        }
      }
    } catch (err: unknown) {
      console.error("Detaljerat inloggningsfel:", err);
      
      if (err instanceof Error) {
        // Handle AuthErrors (preserved authentication errors) separately
        if (err.name === 'AuthError') {
          if (err.message.toLowerCase().includes("invalid login credentials") ||
              err.message.toLowerCase().includes("invalid credentials") ||
              err.message.toLowerCase().includes("invalid email or password") ||
              err.message.toLowerCase().includes("wrong password") ||
              err.message.toLowerCase().includes("incorrect password")) {
            setError(
              "E-postadressen eller lösenordet stämmer inte. Kontrollera att du har stavat rätt och försök igen. " +
              "Kom ihåg att lösenord är skiftlägeskänsliga."
            );
            setShowForgotPassword(true);
          } else if (err.message.toLowerCase().includes("email not confirmed") || 
                     err.message.toLowerCase().includes("email is not confirmed") ||
                     err.message.toLowerCase().includes("not confirmed")) {
            setError(
              "Din e-postadress har inte bekräftats än. Du måste klicka på länken i bekräftelsemailet som skickades " +
              "när du registrerade dig för att aktivera ditt konto."
            );
            setShowResendButton(true);
          } else {
            setError(`Autentiseringsfel: ${err.message}`);
          }
        } else if (err.message.toLowerCase().includes("anslutningsfel") ||
                   err.message.toLowerCase().includes("kunde inte ansluta") ||
                   err.message.toLowerCase().includes("network") ||
                   err.message.toLowerCase().includes("fetch failed") ||
                   err.message.toLowerCase().includes("connection") ||
                   (err.message.toLowerCase().includes("fetch") && !err.message.toLowerCase().includes("credentials"))) {
          setError(
            "Det verkar vara problem med internetanslutningen. Kontrollera att du är ansluten till internet och försök igen. " +
            "Om problemet kvarstår, försök ladda om sidan."
          );
        } else {
          setError(`Ett oväntat fel uppstod: ${err.message}`);
        }
      } else {
        setError("Ett oväntat fel uppstod vid inloggning. Försök igen eller kontakta support om problemet kvarstår.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback${joinCode ? `?join=${joinCode}` : ''}` : undefined,
        },
      });
      
      if (error) {
        setError(`Kunde inte skicka nytt bekräftelsemail: ${error.message}`);
      } else {
        setSuccessMessage("Ett nytt bekräftelsemail har skickats. Kontrollera din inkorg.");
        setShowResendButton(false);
      }
    } catch (err) {
      setError("Ett fel uppstod när bekräftelsemail skulle skickas.");
    } finally {
      setResendLoading(false);
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
            
            {showResendButton && (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs bg-white border-red-200 text-red-600 hover:bg-red-50 w-full"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                >
                  {resendLoading ? "Skickar..." : "Skicka nytt bekräftelsemail"}
                </Button>
              </div>
            )}
            
            {showForgotPassword && (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs bg-white border-red-200 text-red-600 hover:bg-red-50 w-full"
                  onClick={() => {
                    setResetMode(true);
                    setError(null);
                    setShowForgotPassword(false);
                  }}
                >
                  Glömt lösenord? Återställ här
                </Button>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          {isLoading 
            ? (resetMode ? "Skickar..." : "Loggar in...")
            : (resetMode ? "Skicka återställningslänk" : (joinCode ? "Logga in och gå med" : "Logga in"))
          }
        </Button>

        {!resetMode && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">eller</span>
              </div>
            </div>

            <GoogleLoginButton 
              isLoading={isLoading}
              joinCode={joinCode}
            />
          </>
        )}

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
            <Link href={`/signup${joinCode ? `?join=${joinCode}` : ''}`} className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Registrera konto
            </Link>
          </p>
        </div>
      )}
    </div>
  );
} 