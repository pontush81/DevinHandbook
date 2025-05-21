"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";

export default function LoginPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kolla om access_token och refresh_token finns i URL-hashen
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (!error) {
          window.location.replace("/create-handbook");
        } else {
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

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
