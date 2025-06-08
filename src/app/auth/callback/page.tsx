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
    
    // Check for join code in query parameters
    let joinCode = searchParams.get("join");

    if (!access_token || !refresh_token) {
      setStatus("error");
      setMessage("Ingen access token hittades. Prova att logga in igen eller klicka på länken i mailet.");
      return;
    }

    // Sätt sessionen i Supabase-klienten
    supabase.auth.setSession({ access_token, refresh_token })
      .then(async ({ data, error }) => {
        if (error) {
          setStatus("error");
          setMessage("Kunde inte logga in. Prova igen eller kontakta support.");
        } else {
          setStatus("success");
          
          // Om vi inte har join-kod i URL, kolla i användarens metadata
          if (!joinCode && data.user?.user_metadata?.join_code) {
            joinCode = data.user.user_metadata.join_code;
            console.log('[Auth Callback] Found join code in user metadata:', joinCode);
          }
          
          // Bestäm redirection baserat på verifieringstyp
          if (type === "recovery") {
            // För lösenordsåterställning, gå till reset-password
            setMessage("Lösenordsåterställning bekräftad! Du dirigeras nu till lösenordsåterställning...");
            setTimeout(() => {
              router.replace("/reset-password");
            }, 1500);
          } else if (joinCode) {
            // If user has a join code, try to join the handbook automatically
            setMessage("E-post bekräftad! Går med i handboken...");
            
            try {
              const joinResponse = await fetch('/api/handbook/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode }),
              });

              const joinData = await joinResponse.json();

              if (joinResponse.ok && joinData.success) {
                setMessage(`E-post bekräftad och gått med i ${joinData.handbook.title}! Du dirigeras dit nu...`);
                setTimeout(() => {
                  router.replace(`/${joinData.handbook.slug}`);
                }, 2000);
              } else {
                // Join failed, redirect to login with join code
                setMessage("E-post bekräftad! Du dirigeras nu till inloggning för att gå med i handboken...");
                setTimeout(() => {
                  router.replace(`/login?verified=true&from=email_confirmation&join=${joinCode}`);
                }, 1500);
              }
            } catch (error) {
              console.error('Error joining handbook:', error);
              // Join failed, redirect to login with join code
              setMessage("E-post bekräftad! Du dirigeras nu till inloggning för att gå med i handboken...");
              setTimeout(() => {
                router.replace(`/login?verified=true&from=email_confirmation&join=${joinCode}`);
              }, 1500);
            }
          } else {
            // För alla andra typer (inkl. signup, email eller ospecificerat), gå till login med verified=true
            setMessage("E-post bekräftad! Du dirigeras nu till inloggningssidan...");
            setTimeout(() => {
              // Omdirigera till login med meddelande om att verifieringen lyckades
              router.replace("/login?verified=true&from=email_confirmation");
            }, 1500);
          }
        }
      });
  }, [router, searchParams]);
  
  // Funktion för att kontrollera om användaren har handböcker (används inte längre i det direkta flödet)
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
        // Annars till dashboard (tidigare create-handbook)
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("Fel vid hämtning av handböcker:", err);
      router.replace("/dashboard");
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