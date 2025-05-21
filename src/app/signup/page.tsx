"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WizardStepOne } from "@/components/handbook-wizard/WizardStepOne";
import { useRouter } from "next/navigation";

export default function SignupPage() {
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
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">{heading}</h2>
        <WizardStepOne showTabs={true} tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}
