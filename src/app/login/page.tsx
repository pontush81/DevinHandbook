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
      <div className="min-h-screen flex items-center justify-center">
        <div>Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Logga in</h2>
        <WizardStepOne showTabs={true} />
      </div>
    </div>
  );
}
