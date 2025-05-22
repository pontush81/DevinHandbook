"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        <WizardStepOne showTabs={true} />
      </div>
    </div>
  );
}
