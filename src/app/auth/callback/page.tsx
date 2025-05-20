"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const accessToken = searchParams.get("access_token") || window.location.hash.match(/access_token=([^&]+)/)?.[1];
    if (!accessToken) {
      setStatus("error");
      setMessage("Ingen access token hittades. Prova att logga in igen eller klicka på länken i mailet.");
      return;
    }
    supabase.auth.getUser(accessToken)
      .then(({ data, error }) => {
        if (error || !data.user) {
          setStatus("error");
          setMessage("Kunde inte logga in. Prova igen eller kontakta support.");
        } else {
          setStatus("success");
          setMessage("E-post bekräftad! Du loggas nu in...");
          setTimeout(() => {
            router.replace("/dashboard");
          }, 1500);
        }
      });
  }, [router, searchParams]);

  if (status === "loading") {
    return <div className="text-center py-12">Verifierar länk...</div>;
  }
  if (status === "error") {
    return <div className="text-center py-12 text-red-600">{message}</div>;
  }
  return <div className="text-center py-12 text-green-600">{message}</div>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Laddar...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
} 