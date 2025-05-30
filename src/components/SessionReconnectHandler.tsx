"use client";

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Mjuk sessionshantering som försöker återansluta automatiskt
 * utan att störa användarens arbetsflöde
 */
export function SessionReconnectHandler() {
  const [showReconnectPrompt, setShowReconnectPrompt] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const { user, session, refreshAuth } = useAuth();

  // Lyssna på sessionsfel
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    const handleAuthError = (event: CustomEvent) => {
      const error = event.detail?.error || event.detail;
      const errorMessage = typeof error === 'string' 
        ? error 
        : error?.message || '';
      
      // Kontrollera för sessionsrelaterade fel
      if (
        errorMessage.includes('refresh_token_not_found') || 
        errorMessage.includes('invalid session') || 
        errorMessage.includes('JWT expired') ||
        errorMessage.includes('Invalid refresh token') ||
        errorMessage.includes('session_expired') ||
        errorMessage.includes('refresh_token')
      ) {
        console.log('🔄 Session problem detekterat, startar mjuk återanslutning...');
        
        // Försök automatisk återanslutning först
        tryAutoReconnect();
      }
    };

    // Automatisk återanslutning utan att störa användaren
    const tryAutoReconnect = async () => {
      if (isReconnecting || reconnectAttempts >= 3) {
        return;
      }

      setIsReconnecting(true);
      setReconnectAttempts(prev => prev + 1);

      try {
        console.log(`🔄 Försök ${reconnectAttempts + 1}/3: Automatisk sessionsåteranslutning...`);
        
        // Vänta lite innan vi försöker
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Försök hämta session igen
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!error && session && session.user) {
          console.log('✅ Automatisk återanslutning lyckades!');
          setReconnectAttempts(0);
          setShowReconnectPrompt(false);
          setIsReconnecting(false);
          return;
        }

        // Om automatisk återanslutning misslyckades efter 3 försök
        if (reconnectAttempts >= 2) {
          console.log('⚠️ Automatisk återanslutning misslyckades, visar mjuk prompt...');
          setShowReconnectPrompt(true);
          setCountdown(30);
          
          // Starta nedräkning för automatisk utloggning
          countdownTimer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownTimer);
                handleGentleSignout();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // Försök igen efter en stund
          reconnectTimer = setTimeout(tryAutoReconnect, 2000);
        }
      } catch (err) {
        console.error('❌ Fel vid automatisk återanslutning:', err);
        if (reconnectAttempts >= 2) {
          setShowReconnectPrompt(true);
        } else {
          reconnectTimer = setTimeout(tryAutoReconnect, 2000);
        }
      } finally {
        setIsReconnecting(false);
      }
    };

    // Lyssna på auth-fel
    if (typeof window !== 'undefined') {
      window.addEventListener('supabase.auth.error' as any, handleAuthError as any);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('supabase.auth.error' as any, handleAuthError as any);
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [isReconnecting, reconnectAttempts]);

  // Manuell återanslutning
  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    
    try {
      console.log('🔄 Manuell återanslutning...');
      
      const result = await refreshAuth();
      
      if (result.success) {
        console.log('✅ Manuell återanslutning lyckades!');
        setShowReconnectPrompt(false);
        setReconnectAttempts(0);
        setCountdown(30);
      } else {
        console.log('❌ Manuell återanslutning misslyckades');
        // Ge användaren en chans till
        setCountdown(15);
      }
    } catch (error) {
      console.error('❌ Fel vid manuell återanslutning:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Mjuk utloggning utan röda varningar
  const handleGentleSignout = async () => {
    try {
      console.log('🚪 Mjuk utloggning...');
      
      // Rensa lokala data tyst
      await supabase.auth.signOut();
      
      // Mjuk redirect till login med vänlig förklaring
      const currentUrl = window.location.pathname;
      const returnUrl = currentUrl !== '/login' ? `?return=${encodeURIComponent(currentUrl)}` : '';
      
      window.location.href = `/login${returnUrl}&session_renewal=true`;
    } catch (error) {
      console.error('❌ Fel vid mjuk utloggning:', error);
      window.location.href = '/login?session_renewal=true';
    }
  };

  // Visa inte något om användaren inte är inloggad eller allt fungerar
  if (!user || !showReconnectPrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Alert className="border-blue-200 bg-blue-50 shadow-lg">
        <div className="flex items-center gap-2">
          {isReconnecting ? (
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          ) : (
            <WifiOff className="h-4 w-4 text-blue-600" />
          )}
          <div className="flex-1">
            <AlertDescription className="text-blue-800 font-medium text-sm">
              {isReconnecting ? (
                "Återansluter..."
              ) : (
                "Anslutningen behöver förnyas"
              )}
            </AlertDescription>
            <AlertDescription className="text-blue-700 text-xs mt-1">
              {isReconnecting ? (
                "Väntar på återanslutning..."
              ) : (
                `Automatisk inloggning om ${countdown}s`
              )}
            </AlertDescription>
          </div>
        </div>
        
        {!isReconnecting && (
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualReconnect}
              className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Wifi className="h-3 w-3 mr-1" />
              Återanslut nu
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleGentleSignout}
              className="h-8 text-xs text-blue-600 hover:bg-blue-100"
            >
              Logga in igen
            </Button>
          </div>
        )}
      </Alert>
    </div>
  );
} 