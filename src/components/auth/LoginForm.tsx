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
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowResendButton(false);

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
              error.code === "401" || 
              error.code === "422") {
            setError(
              "Din e-postadress har inte bekräftats. Klicka på länken i bekräftelsemailet som skickades " +
              "när du registrerade dig."
            );
            setShowResendButton(true);
          } else {
            setError(`Fel vid inloggning: ${error.message} (Kod: ${error.code})`);
          }
        } else if (!data.session) {
          setError("Kunde inte skapa en aktiv session. Försök igen eller kontakta support.");
        } else {
          // Inloggning lyckades, omdirigera direkt till dashboard
          console.log("Inloggning lyckades, omdirigerar till dashboard");
          
          // Ge mer tid för att säkerställa att cookies har sparats
          // och sessionen har etablerats ordentligt
          setTimeout(async () => {
            try {
              // Hämta en färsk session
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session) {
                console.log("Verifierad session före redirect:", {
                  hasSession: !!session,
                  userId: session.user?.id,
                  expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'
                });
                
                // Använd Next.js router för omdirigering istället för fönsteromdirigering
                // Detta håller sessionskontexten bättre mellan sidor
                router.push("/dashboard");
              } else {
                console.error("Session saknas vid redirect, försöker igen med längre fördröjning...");
                // Om sessionen saknas, försök en gång till med längre fördröjning
                setTimeout(() => {
                  router.push("/dashboard");
                }, 1500); // Ökad fördröjning till 1500ms
              }
            } catch (err) {
              console.error("Fel vid sessionskontroll före redirect:", err);
              // Fortsätt ändå med omdirigering som en fallback
              router.push("/dashboard");
            }
          }, 800); // Ökad primär fördröjning till 800ms
        }
      }
    } catch (err: unknown) {
      console.error("Detaljerat inloggningsfel:", err);
      setError(err instanceof Error ? `${err.message} (${err.name})` : "Ett fel uppstod vid inloggning");
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
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
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