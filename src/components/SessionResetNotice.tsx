"use client";

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Komponent för att visa och hantera sessionsfelmeddelanden
 * och återställa sessionen graciöst vid behov
 */
export default function SessionResetNotice() {
  const [showSessionError, setShowSessionError] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Lyssna på autentiseringsfel
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      // Kontrollera om det är ett refresh token-relaterat fel
      if (
        event.detail?.error?.message?.includes("refresh_token") ||
        event.detail?.message?.includes("refresh_token") ||
        (typeof event.detail?.message === 'string' && 
         event.detail.message.includes("refresh_token"))
      ) {
        console.log("Refresh token error detekterat:", event.detail);
        setShowSessionError(true);
      }
    };

    // Använd event listener för att fånga auth-fel
    if (typeof window !== 'undefined') {
      window.addEventListener('supabase.auth.error' as any, handleAuthError as any);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('supabase.auth.error' as any, handleAuthError as any);
      }
    };
  }, []);

  // Hantera nedräkning och automatisk omdirigering
  useEffect(() => {
    if (showSessionError && !isReset) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleReset();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showSessionError, isReset]);

  // Funktion för att hantera session reset
  const handleReset = async () => {
    setIsReset(true);
    
    try {
      // Rensa cookies
      document.cookie.split(';').forEach(c => {
        const cookieName = c.split('=')[0].trim();
        if (cookieName.startsWith('sb-')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          if (process.env.NODE_ENV === 'production') {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.handbok.org;`;
          }
        }
      });
      
      // Logga ut via Supabase
      await supabase.auth.signOut();
      
      // Omdirigera till inloggningssidan
      setTimeout(() => {
        window.location.href = '/login?session_expired=true';
      }, 500);
    } catch (error) {
      console.error("Fel vid sessionsåterställning:", error);
      // Forcera omdirigering även vid fel
      window.location.href = '/login?session_expired=true';
    }
  };

  if (!showSessionError) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sessionsfel detekterat</AlertTitle>
          <AlertDescription>
            Din session har upphört eller blivit ogiltig. Du kommer att dirigeras om till 
            inloggningssidan för att logga in på nytt.
          </AlertDescription>
        </Alert>
        
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Omdirigering om {countdown} sekunder...
          </p>
          <Button 
            variant="default" 
            onClick={handleReset}
            disabled={isReset}
          >
            {isReset ? "Återställer..." : "Återställ nu"}
          </Button>
        </div>
      </div>
    </div>
  );
} 