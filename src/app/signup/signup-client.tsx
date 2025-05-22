"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";

export default function SignupClient() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'signup' | 'login' | 'reset'>('signup');
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div>Laddar...</div>
      </div>
    );
  }

  let heading = 'Registrera konto';
  if (tab === 'login' || tab === 'reset') heading = 'Logga in';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {heading}
          </h1>
          <p className="text-gray-600">
            Skapa ditt konto för att komma igång med Handbok.org
          </p>
        </div>

        {/* Form */}
        <WizardStepOne showTabs={true} tab={tab} setTab={setTab} />
        
      </div>
    </div>
  );
} 