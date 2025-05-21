"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkIfLoggedIn() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
    }
    checkIfLoggedIn();
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
        {/* <h2 className="text-2xl font-bold mb-4 text-center">Skapa konto</h2> */}
        <WizardStepOne showTabs={true} />
      </div>
    </div>
  );
}
