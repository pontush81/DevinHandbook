"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const fromEmailConfirmation = searchParams.get("from") === "email_confirmation";
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);

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
    async function checkIfLoggedIn() {
      try {
        // Kolla om access_token och refresh_token finns i URL-hashen
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace("#", "?"));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) {
            const { data: { user: sessionUser } } = await supabase.auth.getUser();
            setUser(sessionUser);
            setRedirecting(true);
            
            // Hämta användarens handböcker
            const { data, error: handbooksError } = await supabase
              .from("handbooks")
              .select("subdomain")
              .order("created_at", { ascending: false });
              
            if (!handbooksError && data && data.length > 0) {
              window.location.replace(`https://${data[0].subdomain}.handbok.org`);
            } else {
              router.replace("/dashboard");
            }
          }
        } else {
          // Kontrollera om användaren redan är inloggad
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          setUser(currentUser);
          
          if (currentUser) {
            setRedirecting(true);
            // Hämta användarens handböcker
            const { data, error: handbooksError } = await supabase
              .from("handbooks")
              .select("subdomain")
              .order("created_at", { ascending: false });
              
            if (!handbooksError && data && data.length > 0) {
              window.location.replace(`https://${data[0].subdomain}.handbok.org`);
            } else {
              router.replace("/dashboard");
            }
          }
        }
      } catch (error) {
        console.error("Fel vid kontroll av inloggningsstatus:", error);
      } finally {
        setLoading(false);
      }
    }
    
    checkIfLoggedIn();
  }, [router]);

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
                    <Button className="w-full">
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

  // Om användaren försöker byta till signup-fliken på /login-sidan, 
  // skicka dem till /signup-sidan istället
  const handleTabChange = (newTab: 'signup' | 'login' | 'reset') => {
    if (newTab === 'signup') {
      router.push('/signup');
    } else {
      // Behåll reset-fliken på login-sidan
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        
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
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Logga in
          </h1>
          <p className="text-gray-600">
            Logga in för att få tillgång till din handbok
          </p>
        </div>

        {/* Form */}
        <WizardStepOne showTabs={true} tab="login" setTab={handleTabChange} />
      </div>
    </div>
  );
} 