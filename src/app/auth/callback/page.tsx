"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, fetchWithAuth } from "@/lib/supabase";
import { safeLocalStorage } from "@/lib/safe-storage";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  // Debug function for testing join code in console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testAuthCallbackJoin = async (joinCode: string) => {
        console.log('[Auth Callback Test] Testing join with code:', joinCode);
        try {
          const joinResponse = await fetchWithAuth('/api/handbook/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joinCode }),
          });
          const joinData = await joinResponse.json();
          console.log('[Auth Callback Test] Join response:', {
            status: joinResponse.status,
            ok: joinResponse.ok,
            data: joinData
          });
          return { status: joinResponse.status, ok: joinResponse.ok, data: joinData };
        } catch (error) {
          console.error('[Auth Callback Test] Join error:', error);
          return { error };
        }
      };
      console.log('[Auth Callback] Test function available: window.testAuthCallbackJoin(joinCode)');
    }
    
    const handleAuth = async () => {
      console.log('[Auth Callback] ========== AUTH CALLBACK STARTED ==========');
      console.log('[Auth Callback] Full URL:', window.location.href);
      console.log('[Auth Callback] All URL params:', Object.fromEntries(searchParams.entries()));
      
      // Check for OAuth code parameter (Google OAuth)
      const code = searchParams.get("code");
      console.log('[Auth Callback] Code parameter:', code);
      
      if (code) {
        console.log('[Auth Callback] ===== GOOGLE OAUTH FLOW DETECTED =====');
        console.log('[Auth Callback] Google OAuth code found:', code);
        console.log('[Auth Callback] Current URL:', window.location.href);
        console.log('[Auth Callback] Search params object:', searchParams);
        console.log('[Auth Callback] All search params:', searchParams.toString());
        
        // For Google OAuth, Supabase handles the code exchange automatically
        // The session should already be set when we reach this callback
        setStatus("success");
        
        // Check for join code
        let joinCode = searchParams.get("join");
        console.log('[Auth Callback] Join code from URL params:', joinCode);
        
        if (joinCode) {
          console.log('[Auth Callback] Found join code for Google OAuth:', joinCode);
          setMessage("Google inloggning lyckades! Går med i handboken...");
          
          // Set flags to prevent smartRedirect from interfering
          safeLocalStorage.setItem('joining_handbook_via_code', 'true');
          safeLocalStorage.setItem('pending_join_code', joinCode);
          safeLocalStorage.setItem('join_process_started', Date.now().toString());
          if (typeof window !== 'undefined') {
            (window as any).__joining_handbook = true;
          }
          
          // Give a bit more time for Google OAuth session to stabilize
          setTimeout(async () => {
            try {
              // 🔒 SAFETY: Check if signup-client already processed this join
              const joinAttemptInProgress = safeLocalStorage.getItem('join_attempt_in_progress');
              if (joinAttemptInProgress) {
                const attemptTime = parseInt(joinAttemptInProgress);
                const timeSinceAttempt = Date.now() - attemptTime;
                
                // If join attempt is recent (within 30 seconds), skip to prevent duplicate
                if (timeSinceAttempt < 30000) {
                  console.log('[Auth Callback] Recent join attempt detected, skipping Google OAuth join to prevent duplicate');
                  setMessage("Inloggning lyckades! Du dirigeras...");
                  setTimeout(() => {
                    if (typeof window !== 'undefined') {
                      const { smartRedirect } = require('@/lib/redirect-utils');
                      smartRedirect();
                    }
                  }, 1000);
                  return;
                }
              }
              
              console.log('[Auth Callback] Attempting to join handbook with code:', joinCode);
              
              // Use fetchWithAuth to automatically include Bearer token when cookies fail
              console.log('[Auth Callback] Making join request to:', '/api/handbook/join');
              console.log('[Auth Callback] Join request body:', { joinCode });
              
              const joinResponse = await fetchWithAuth('/api/handbook/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode }),
              });

              console.log('[Auth Callback] Join response status:', joinResponse.status);
              console.log('[Auth Callback] Join response headers:', joinResponse.headers);
              
              const joinData = await joinResponse.json();
              console.log('[Auth Callback] Join response data:', joinData);

              if (joinResponse.ok && joinData.success) {
                console.log('[Auth Callback] Join successful for Google OAuth user');
        
        // 🔄 TRIGGER MEMBERS LIST REFRESH FOR ADMINS
        console.log('📢 [Auth Callback] Triggering members list refresh across all pages');
        
        const refreshData = {
          type: 'MEMBER_JOINED',
          handbookId: joinData.handbook.id,
          handbookTitle: joinData.handbook.title,
          userRole: joinData.role,
          timestamp: Date.now(),
          source: 'auth_callback_join'
        };
        
        // Method 1: BroadcastChannel (most reliable cross-page)
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('handbook-members');
            channel.postMessage(refreshData);
            channel.close();
            console.log('📻 [Auth Callback] Members refresh BroadcastChannel sent');
          }
        } catch (error) {
          console.error('❌ [Auth Callback] BroadcastChannel error:', error);
        }
        
        // Method 2: localStorage event (fallback)
        try {
          localStorage.setItem('handbook-members-refresh', JSON.stringify(refreshData));
          setTimeout(() => {
            localStorage.removeItem('handbook-members-refresh');
          }, 1000);
          console.log('💾 [Auth Callback] Members refresh localStorage event sent');
        } catch (error) {
          console.error('❌ [Auth Callback] localStorage error:', error);
        }
        
        // Method 3: Polling marker (ultimate fallback)
        try {
          localStorage.setItem('handbook-members-last-update', JSON.stringify(refreshData));
          console.log('⏰ [Auth Callback] Members polling marker set');
        } catch (error) {
          console.error('❌ [Auth Callback] Polling marker error:', error);
        }
                setMessage(`Välkommen till "${joinData.handbook.title}"! Du dirigeras dit nu...`);
                // Clear all join-related flags before redirecting
                safeLocalStorage.removeItem('joining_handbook_via_code');
                safeLocalStorage.removeItem('pending_join_code');
                safeLocalStorage.removeItem('join_process_started');
                safeLocalStorage.removeItem('join_attempt_in_progress'); // 🔒 SAFETY
                if (typeof window !== 'undefined') {
                  delete (window as any).__joining_handbook;
                }
                setTimeout(() => {
                  router.replace(`/${joinData.handbook.slug}`);
                }, 2000);
              } else {
                console.error('[Auth Callback] Google OAuth join failed:', joinData);
                setMessage("Inloggning lyckades, men kunde inte gå med i handboken. Du dirigeras till inloggning...");
                // Clear flags and redirect to login with join code
                safeLocalStorage.removeItem('joining_handbook_via_code');
                safeLocalStorage.removeItem('pending_join_code');
                safeLocalStorage.removeItem('join_process_started');
                safeLocalStorage.removeItem('join_attempt_in_progress'); // 🔒 SAFETY
                if (typeof window !== 'undefined') {
                  delete (window as any).__joining_handbook;
                }
                setTimeout(() => {
                  router.replace(`/login?verified=true&from=google_oauth&join=${joinCode}`);
                }, 1500);
              }
            } catch (error) {
              console.error('[Auth Callback] Error joining handbook via Google OAuth:', error);
              setMessage("Inloggning lyckades, men kunde inte gå med i handboken. Du dirigeras till inloggning...");
              // Clear flags and redirect to login with join code
              safeLocalStorage.removeItem('joining_handbook_via_code');
              safeLocalStorage.removeItem('pending_join_code');
              safeLocalStorage.removeItem('join_process_started');
              safeLocalStorage.removeItem('join_attempt_in_progress'); // 🔒 SAFETY
              if (typeof window !== 'undefined') {
                delete (window as any).__joining_handbook;
              }
              setTimeout(() => {
                router.replace(`/login?verified=true&from=google_oauth&join=${joinCode}`);
              }, 1500);
            }
          }, 2000); // Extra time for Google OAuth session to stabilize
        } else {
          console.log('[Auth Callback] ===== NO JOIN CODE FOUND FOR GOOGLE OAUTH =====');
          console.log('[Auth Callback] Join code was:', joinCode);
          console.log('[Auth Callback] Using standard smart redirect...');
          setMessage("Google inloggning lyckades! Du omdirigeras...");
          // No join code, use normal smart redirect
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              const { smartRedirect } = require('@/lib/redirect-utils');
              smartRedirect();
            }
          }, 1000);
        }
        return;
      }
      
      // Handle hash-based tokens (email verification, password reset, etc.)
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
          
          // Om vi inte har join-kod i URL, kolla i användarens metadata eller localStorage
          if (!joinCode && data.user?.user_metadata?.join_code) {
            joinCode = data.user.user_metadata.join_code;
            console.log('[Auth Callback] Found join code in user metadata:', joinCode);
          } else if (!joinCode) {
            joinCode = safeLocalStorage.getItem('pending_join_code');
            if (joinCode) {
              console.log('[Auth Callback] Found join code in localStorage:', joinCode);
            }
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
            
            // Set flags in localStorage to prevent smartRedirect from interfering
            console.log('[Auth Callback] Setting joining_handbook_via_code flag to true');
            safeLocalStorage.setItem('joining_handbook_via_code', 'true');
            safeLocalStorage.setItem('pending_join_code', joinCode);
            safeLocalStorage.setItem('join_process_started', Date.now().toString());
            
            // Add a small delay to ensure session is properly established
            setTimeout(async () => {
              try {
                // Use fetchWithAuth to automatically include Bearer token when cookies fail
                const joinResponse = await fetchWithAuth('/api/handbook/join', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ joinCode }),
                });

                const joinData = await joinResponse.json();

                if (joinResponse.ok && joinData.success) {
                  setMessage(`E-post bekräftad och gått med i ${joinData.handbook.title}! Du dirigeras dit nu...`);
                  // Clear all join-related flags before redirecting
                  console.log('[Auth Callback] Clearing join flags - join successful');
                  safeLocalStorage.removeItem('joining_handbook_via_code');
                  safeLocalStorage.removeItem('pending_join_code');
                  safeLocalStorage.removeItem('join_process_started');
                  safeLocalStorage.removeItem('join_attempt_in_progress'); // 🔒 SAFETY
                  if (typeof window !== 'undefined') {
                    delete (window as any).__joining_handbook;
                  }
                  setTimeout(() => {
                    router.replace(`/${joinData.handbook.slug}`);
                  }, 2000);
                } else {
                  console.error('[Auth Callback] Join failed:', joinData);
                  // Clear all join-related flags on failure
                  safeLocalStorage.removeItem('joining_handbook_via_code');
                  safeLocalStorage.removeItem('pending_join_code');
                  safeLocalStorage.removeItem('join_process_started');
                  safeLocalStorage.removeItem('join_attempt_in_progress'); // 🔒 SAFETY
                  if (typeof window !== 'undefined') {
                    delete (window as any).__joining_handbook;
                  }
                  // Join failed, redirect to login with join code
                  setMessage("E-post bekräftad! Du dirigeras nu till inloggning för att gå med i handboken...");
                  setTimeout(() => {
                    router.replace(`/login?verified=true&from=email_confirmation&join=${joinCode}`);
                  }, 1500);
                }
              } catch (error) {
                console.error('Error joining handbook:', error);
                // Clear all join-related flags on error
                safeLocalStorage.removeItem('joining_handbook_via_code');
                safeLocalStorage.removeItem('pending_join_code');
                safeLocalStorage.removeItem('join_process_started');
                if (typeof window !== 'undefined') {
                  delete (window as any).__joining_handbook;
                }
                // Join failed, redirect to login with join code
                setMessage("E-post bekräftad! Du dirigeras nu till inloggning för att gå med i handboken...");
                setTimeout(() => {
                  router.replace(`/login?verified=true&from=email_confirmation&join=${joinCode}`);
                }, 1500);
              }
            }, 2000); // 2 second delay to ensure session is established
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
    };
    
    handleAuth();
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
        // Om användaren har handböcker, dirigera till den senaste med path-baserad routing
        router.replace(`/${data[0].subdomain}`);
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