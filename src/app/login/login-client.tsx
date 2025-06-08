"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Key, Book, AlertCircle, Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { smartRedirectWithPolling } from '@/lib/redirect-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HandbookInfo {
  id: string;
  title: string;
  slug: string;
  expiresAt: string | null;
}

export default function LoginClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const fromEmailConfirmation = searchParams.get("from") === "email_confirmation";
  const registrationSuccess = searchParams.get("registration") === "success";
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);
  const [showRegistrationMessage, setShowRegistrationMessage] = useState(false);
  const [showLoggedOutMessage, setShowLoggedOutMessage] = useState(false);
  const [showSessionRenewalMessage, setShowSessionRenewalMessage] = useState(false);
  
  // Join code related state
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [handbookInfo, setHandbookInfo] = useState<HandbookInfo | null>(null);
  const [joinCodeValidating, setJoinCodeValidating] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Check for join code in URL
  useEffect(() => {
    const joinParam = searchParams.get('join');
    if (joinParam) {
      setJoinCode(joinParam);
      validateJoinCode(joinParam);
    }
  }, [searchParams]);

  const validateJoinCode = async (code: string) => {
    setJoinCodeValidating(true);
    setJoinCodeError(null);
    
    try {
      const response = await fetch(`/api/handbook/join?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setHandbookInfo(data.handbook);
      } else {
        setJoinCodeError(data.message || 'Ogiltig join-kod');
      }
    } catch (error) {
      console.error('Error validating join code:', error);
      setJoinCodeError('Kunde inte validera join-kod');
    } finally {
      setJoinCodeValidating(false);
    }
  };

  // Join handbook after successful login
  const handleJoinHandbook = async (loggedInUser: User) => {
    if (!joinCode || !handbookInfo) return;

    setIsJoining(true);
    try {
      const response = await fetch('/api/handbook/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJoinSuccess(true);
        // Redirect to handbook after successful join
        setTimeout(() => {
          router.push(`/${handbookInfo.slug}`);
        }, 2000);
      } else {
        setJoinCodeError(data.message || 'Kunde inte gå med i handboken');
        // Still redirect using normal flow if join fails
        setTimeout(() => {
          smartRedirectWithPolling(3, 800);
        }, 2000);
      }
    } catch (error) {
      console.error('Error joining handbook:', error);
      setJoinCodeError('Kunde inte gå med i handboken');
      // Still redirect using normal flow if join fails
      setTimeout(() => {
        smartRedirectWithPolling(3, 800);
      }, 2000);
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    // Kolla om e-posten är verifierad via URL-parametern
    if (verified === "true") {
      setShowVerifiedMessage(true);
      // Automatiskt ta bort meddelandet efter 10 sekunder
      const timer = setTimeout(() => {
        setShowVerifiedMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [verified]);

  useEffect(() => {
    // Kolla om användaren kommer från registrering
    if (registrationSuccess) {
      setShowRegistrationMessage(true);
      // Automatiskt ta bort meddelandet efter 10 sekunder
      const timer = setTimeout(() => {
        setShowRegistrationMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess]);

  useEffect(() => {
    // Kontrollera om användaren precis loggat ut
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logged_out') === 'true') {
      setShowLoggedOutMessage(true);
      // Rensa parametern från URL:en
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  useEffect(() => {
    // Kontrollera om användaren kommer från session förnyelse
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session_renewal') === 'true') {
      setShowSessionRenewalMessage(true);
      // Rensa parametern från URL:en utan att ladda om sidan
      const newUrl = window.location.pathname + (urlParams.get('return') ? `?return=${urlParams.get('return')}` : '');
      window.history.replaceState({}, document.title, newUrl);
      
      // Ta bort meddelandet efter 8 sekunder
      const timer = setTimeout(() => {
        setShowSessionRenewalMessage(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    async function checkIfLoggedIn() {
      try {
        // Kolla om access_token och refresh_token finns i URL-hashen
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace("#", "?"));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          console.log("Hittade access_token och refresh_token i URL-hash, försöker sätta session");
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) {
            console.log("Session satt med token från URL");
            const { data: { user: sessionUser } } = await supabase.auth.getUser();
            setUser(sessionUser);
            setRedirecting(true);
            
            // If user has join code, handle that first
            if (sessionUser && joinCode && handbookInfo) {
              await handleJoinHandbook(sessionUser);
              return;
            }
            
            // Implementera en robust session-kontroll med polling
            let attempts = 0;
            const maxAttempts = 5;
            const checkInterval = 800; // 800ms mellan varje kontroll
            
            const checkSessionAndRedirect = async () => {
              attempts++;
              console.log(`Kontrollerar session med token från URL (försök ${attempts}/${maxAttempts})...`);
              
              try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                  console.log("Session bekräftad, använder smart redirect...");
                  smartRedirectWithPolling(3, 800);
                  return;
                } else if (attempts >= maxAttempts) {
                  console.log("Nådde max antal försök, fallback till dashboard...");
                  window.location.href = "/dashboard";
                  return;
                } else {
                  console.log("Ingen session hittades ännu, väntar och försöker igen...");
                  setTimeout(checkSessionAndRedirect, checkInterval);
                }
              } catch (error) {
                console.error("Fel vid sessionskontroll:", error);
                if (attempts >= maxAttempts) {
                  window.location.href = "/dashboard";
                } else {
                  setTimeout(checkSessionAndRedirect, checkInterval);
                }
              }
            };
            
            // Starta sessionskontrollerna efter en initial fördröjning
            setTimeout(checkSessionAndRedirect, 1000);
          } else {
            console.error("Fel vid inställning av session från tokens:", error);
          }
        } else {
          // Kontrollera om användaren redan är inloggad
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          setUser(currentUser);
          
          if (currentUser) {
            setRedirecting(true);
            
            // If user has join code, handle that first
            if (joinCode && handbookInfo) {
              await handleJoinHandbook(currentUser);
              return;
            }
            
            // Implementera en robust session-kontroll med polling
            let attempts = 0;
            const maxAttempts = 5;
            const checkInterval = 800; // 800ms mellan varje kontroll
            
            const checkSessionAndRedirect = async () => {
              attempts++;
              console.log(`Kontrollerar session för befintlig användare (försök ${attempts}/${maxAttempts})...`);
              
              try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                  console.log("Session bekräftad, använder smart redirect...");
                  smartRedirectWithPolling(3, 800);
                  return;
                } else if (attempts >= maxAttempts) {
                  console.log("Nådde max antal försök, fallback till dashboard...");
                  window.location.href = "/dashboard";
                  return;
                } else {
                  console.log("Ingen session hittades ännu, väntar och försöker igen...");
                  setTimeout(checkSessionAndRedirect, checkInterval);
                }
              } catch (error) {
                console.error("Fel vid sessionskontroll:", error);
                if (attempts >= maxAttempts) {
                  window.location.href = "/dashboard";
                } else {
                  setTimeout(checkSessionAndRedirect, checkInterval);
                }
              }
            };
            
            // Starta sessionskontrollerna efter en initial fördröjning
            setTimeout(checkSessionAndRedirect, 1000);
          }
        }
      } catch (error) {
        console.error("Fel vid kontroll av inloggningsstatus:", error);
      } finally {
        setLoading(false);
      }
    }
    
    checkIfLoggedIn();
  }, [router, joinCode, handbookInfo]);

  // Success state for joining handbook
  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Välkommen!</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Du har gått med i <strong>{handbookInfo?.title}</strong>! 
                Du omdirigeras dit nu...
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Omdirigerar...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Om användaren är inloggad och joinar
  if (user && isJoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Går med i handboken...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Om användaren är inloggad, visa lämpligt UI
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg border border-gray-100 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Du är inloggad
            </h1>
            <p className="text-gray-600 mb-6">
              Du är inloggad som <span className="font-semibold">{user.email}</span>
            </p>
            
            <div className="space-y-4">
              {redirecting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span>Omdirigerar dig...</span>
                </div>
              ) : (
                <>
                  <Link href="/dashboard">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Gå till dashboard
                    </Button>
                  </Link>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUser(null);
                      window.location.reload();
                    }}
                  >
                    Logga ut
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
        <div className="flex items-center">
          <div className="animate-spin h-5 w-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Laddar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        
        {/* Join Code Information */}
        {joinCode && (
          <div className="mb-6">
            {joinCodeValidating ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Validerar join-kod...</span>
                  </div>
                </CardContent>
              </Card>
            ) : joinCodeError ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{joinCodeError}</AlertDescription>
              </Alert>
            ) : handbookInfo ? (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <Key className="h-5 w-5" />
                    <span>Inbjudan till handbok</span>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <Book className="h-4 w-4" />
                    <span>Du är inbjuden till: <strong>{handbookInfo.title}</strong></span>
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}
          </div>
        )}

        {/* Success Message */}
        {showVerifiedMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">
              {fromEmailConfirmation ? "E-post bekräftad!" : "E-post verifierad!"}
            </AlertTitle>
            <AlertDescription className="text-green-700">
              {fromEmailConfirmation 
                ? "Tack för att du bekräftade din e-postadress. Du kan nu logga in med dina uppgifter för att komma igång."
                : "Ditt konto har verifierats. Du kan nu logga in med dina uppgifter."}
            </AlertDescription>
          </Alert>
        )}

        {/* Logout Success Message */}
        {showLoggedOutMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">
              Du har loggats ut
            </AlertTitle>
            <AlertDescription className="text-green-700">
              Du har framgångsrikt loggats ut från ditt konto. Du kan nu logga in igen eller gå till startsidan.
            </AlertDescription>
          </Alert>
        )}

        {/* Registration Success Message */}
        {showRegistrationMessage && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-800">
              Konto skapat!
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              <p>
                Vi har skickat ett bekräftelsemail till din e-postadress.
              </p>
              <p className="mt-2 font-medium">
                <span className="text-red-600">VIKTIGT:</span> Du måste klicka på länken i mailet 
                för att aktivera ditt konto innan du kan logga in.
              </p>
              <p className="mt-2 text-xs">
                Kontrollera din skräppost om du inte hittar mailet i inkorgen. Om du fortfarande inte hittar mailet, 
                kan du försöka logga in och använda "Skicka nytt bekräftelsemail"-funktionen.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Session Renewal Message */}
        {showSessionRenewalMessage && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-800">
              Sessionen behöver förnyas
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              <p>
                Du har varit inaktiv en längre stund, så vi behöver förnya din session av säkerhetsskäl.
              </p>
              <p className="mt-2">
                Logga bara in igen så kommer du tillbaka till där du var.
              </p>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {joinCode ? 'Logga in och gå med' : 'Logga in'}
          </h1>
          <p className="text-gray-600">
            {joinCode 
              ? `Logga in för att gå med i ${handbookInfo?.title || 'handboken'}`
              : 'Logga in för att få tillgång till din handbok'
            }
          </p>
        </div>

        {/* Form */}
        <LoginForm 
          showSignupLink={true} 
          onSuccess={handbookInfo ? handleJoinHandbook : undefined}
          joinCode={joinCode}
        />
      </div>
    </div>
  );
} 