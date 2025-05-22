"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function SessionResetNotice() {
  const { signOut } = useAuth();
  const [showNotice, setShowNotice] = useState(false);
  const [tokenErrors, setTokenErrors] = useState(0);

  // Lyssna efter refresh token fel
  useEffect(() => {
    const handleTokenError = (event: ErrorEvent) => {
      // Lyssna efter specifika token-relaterade fel
      if (
        event.error?.message?.includes("refresh_token") ||
        event.message?.includes("refresh_token") ||
        (typeof event.message === "string" && 
         event.message.includes("refresh_token"))
      ) {
        setTokenErrors((prev) => prev + 1);
      }
    };

    // Lyssna på konsolfel
    window.addEventListener("error", handleTokenError);
    
    // Visa notisen om vi ser tillräckligt många token-fel
    const checkForErrors = setInterval(() => {
      const hasErrors = tokenErrors > 3;
      setShowNotice(hasErrors);
    }, 3000);

    return () => {
      window.removeEventListener("error", handleTokenError);
      clearInterval(checkForErrors);
    };
  }, [tokenErrors]);

  if (!showNotice) return null;

  return (
    <Alert className="mb-4 bg-amber-50 border-amber-300">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Inloggningsproblem upptäckt</AlertTitle>
      <AlertDescription className="text-amber-700">
        Vi har uppdaterat inloggningssystemet. Om du upplever problem,
        vänligen logga ut och in igen för att få en ny fräsch session.
        <div className="mt-2">
          <Button 
            variant="outline" 
            className="border-amber-500 bg-white text-amber-700 hover:bg-amber-100"
            onClick={() => signOut()}
          >
            Logga ut nu
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
} 