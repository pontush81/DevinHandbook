"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
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
    // Kolla om access_token och refresh_token finns i URL-hashen
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    async function handleLoginRedirect() {
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) {
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
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    handleLoginRedirect();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div>Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        
        {/* Success Message */}
        {showVerifiedMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">E-post verifierad!</AlertTitle>
            <AlertDescription className="text-green-700">
              Ditt konto har verifierats. Du kan nu logga in med dina uppgifter.
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
        <WizardStepOne showTabs={true} tab="login" />
      </div>
    </div>
  );
}
