"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { safeLocalStorage } from "@/lib/safe-storage";
import Link from "next/link";
import { CheckCircle2, Mail as MailIcon, Info as InfoIcon, Key } from "lucide-react";

interface SignUpFormProps {
  showLoginLink?: boolean;
  onSuccess?: (user: User) => void;
  joinCode?: string | null;
}

export function SignUpForm({ showLoginLink = true, onSuccess, joinCode }: SignUpFormProps) {
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
              // Store join code in localStorage for persistence across redirects
        if (joinCode) {
          safeLocalStorage.setItem('pending_join_code', joinCode);
          safeLocalStorage.setItem('join_process_started', Date.now().toString());
          console.log('[SignUpForm] Stored join code in localStorage:', joinCode);
        }

        // Create user with custom email handling in development
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // In development, completely disable Supabase emails
            emailRedirectTo: process.env.NODE_ENV === 'development' ? '' : undefined,
            data: joinCode ? { join_code: joinCode } : undefined
          },
        });
      
      if (error) {
        if (error.code === "user_already_exists" || error.code === "email_exists") {
          // Instead of showing an error, gracefully redirect to login
          console.log('[SignUpForm] User already exists, redirecting to login...');
          setSuccessMessage("redirect_to_login");
          
          // Add a short delay so user can see the message
          setTimeout(() => {
            const loginUrl = `/login${joinCode ? `?join=${joinCode}` : ''}`;
            router.push(loginUrl);
          }, 2000);
          
          return; // Don't proceed with registration flow
        } else {
          setError(error.message);
        }
      } else if (data.user) {
        // User created successfully, send custom confirmation email via Resend
        console.log('[SignUp] User created, sending custom confirmation email...');
        
        try {
          const emailResponse = await fetch('/api/auth/send-confirmation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: data.user.email,
              userId: data.user.id,
              joinCode 
            }),
          });

          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            console.log('[SignUp] Custom confirmation email sent successfully', emailData);
            
            setSuccessMessage("success");
            
            // Efter 8 sekunder, omdirigera till inloggningssidan
            setTimeout(() => {
              router.push(`/login?registration=success${joinCode ? `&join=${joinCode}` : ''}`);
            }, 8000);
          } else {
            console.error('[SignUp] Failed to send custom confirmation email');
            setError('Kontot skapades men bekräftelsemail kunde inte skickas. Försök skicka ett nytt bekräftelsemail.');
          }
        } catch (emailError) {
          console.error('[SignUp] Error sending custom confirmation email:', emailError);
          setError('Kontot skapades men bekräftelsemail kunde inte skickas. Försök skicka ett nytt bekräftelsemail.');
        }
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
        <div className={`p-3 border rounded-md mb-4 ${joinCode ? 'bg-blue-50 border-blue-100' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex items-start gap-2">
            {joinCode ? (
              <Key className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            ) : (
              <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm text-blue-700">
              {joinCode ? (
                <>
                  <p className="font-medium">Du kommer att gå med i handboken efter registrering!</p>
                  <p>1. Skapa ditt konto nedan</p>
                  <p>2. Du får ett bekräftelsemail - klicka på länken</p>
                  <p>3. Du kommer automatiskt att bli medlem i handboken</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Nästa steg:</p>
                  <p>1. Du får ett bekräftelsemail - klicka på länken för att aktivera kontot</p>
                  <p>2. Logga sedan in för att skapa din första digitala handbok</p>
                </>
              )}
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
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-md">
            {successMessage === "redirect_to_login" ? (
              // Message for existing users
              <>
                <div className="flex items-start gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-700 font-medium">Du har redan ett konto! 👍</span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 text-sm mt-0.5">🔐</span>
                    <div className="text-sm">
                      Vi omdirigerar dig till inloggningssidan så du kan logga in
                      {joinCode ? " och gå med i handboken" : ""}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm italic text-blue-600 flex items-center gap-2">
                  <span>Omdirigerar om 2 sekunder...</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push(`/login${joinCode ? `?join=${joinCode}` : ''}`)}
                    className="ml-2"
                  >
                    Gå dit nu
                  </Button>
                </div>
              </>
            ) : (
              // Message for new users
              <>
                <div className="flex items-start gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-green-700 font-medium">Konto skapat! 🎉</span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <MailIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold text-red-600">STEG 1:</span> Kolla din e-post och klicka på bekräftelselänken
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    {joinCode ? (
                      <Key className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <span className="text-blue-600 text-sm mt-0.5">📚</span>
                    )}
                    <div className="text-sm">
                      <span className="font-bold text-blue-600">STEG 2:</span> 
                      {joinCode ? " Du kommer automatiskt att gå med i handboken" : " Logga in och skapa din första handbok"}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm italic text-blue-600 flex items-center gap-2">
                  <span>Du omdirigeras till inloggningssidan om 8 sekunder...</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push(`/login?registration=success${joinCode ? `&join=${joinCode}` : ''}`)}
                    className="ml-2"
                  >
                    Gå dit nu
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? "Skapar konto..." : (joinCode ? "Skapa konto och gå med" : "Skapa konto")}
        </Button>
      </form>

      {showLoginLink && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Har du redan ett konto?{" "}
            <Link href={`/login${joinCode ? `?join=${joinCode}` : ''}`} className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Logga in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
