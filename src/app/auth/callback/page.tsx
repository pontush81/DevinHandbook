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
    // Hämta tokens från URL-hash
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type"); // Type kan vara 'signup', 'recovery', etc.

    if (!access_token || !refresh_token) {
      setStatus("error");
      setMessage("Ingen access token hittades. Prova att logga in igen eller klicka på länken i mailet.");
      return;
    }

    // Sätt sessionen i Supabase-klienten
    supabase.auth.setSession({ access_token, refresh_token })
      .then(({ data, error }) => {
        if (error) {
          setStatus("error");
          setMessage("Kunde inte logga in. Prova igen eller kontakta support.");
        } else {
          setStatus("success");
          
          // Bestäm redirection baserat på verifieringstyp
          if (type === "signup" || type === "email") {
            setMessage("E-post bekräftad! Du dirigeras nu till inloggningssidan...");
            setTimeout(() => {
              // Omdirigera till login med meddelande om att verifieringen lyckades
              router.replace("/login?verified=true");
            }, 1500);
          } else if (type === "recovery") {
            setMessage("Lösenordsåterställning bekräftad! Du dirigeras nu till inloggningssidan...");
            setTimeout(() => {
              router.replace("/reset-password");
            }, 1500);
          } else {
            // Om användaren redan är inloggad, dirigera till startsidan för inloggade
            setMessage("Autentisering lyckades! Du dirigeras nu...");
            setTimeout(() => {
              // Kontrollera om användaren har handböcker
              checkForHandbooks(data.session.user.id);
            }, 1500);
          }
        }
      });
  }, [router]);
  
  // Funktion för att kontrollera om användaren har handböcker
  const checkForHandbooks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("handbooks")
        .select("subdomain")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (!error && data && data.length > 0) {
        // Om användaren har handböcker, dirigera till den senaste
        window.location.replace(`https://${data[0].subdomain}.handbok.org`);
      } else {
        // Annars till skapa handbok-sidan
        router.replace("/create-handbook");
      }
    } catch (err) {
      console.error("Fel vid hämtning av handböcker:", err);
      router.replace("/create-handbook");
    }
  };

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