"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface GoogleLoginButtonProps {
  isLoading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  joinCode?: string | null;
  redirectTo?: string;
}

export function GoogleLoginButton({ 
  isLoading = false, 
  onLoadingChange, 
  joinCode, 
  redirectTo 
}: GoogleLoginButtonProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const loading = isLoading || localLoading;

  const handleGoogleLogin = async () => {
    try {
      setLocalLoading(true);
      onLoadingChange?.(true);

      // Konstruera redirect URL med join code om det finns
      const baseUrl = window.location.origin;
      let authRedirectTo = `${baseUrl}/auth/callback`;
      
      // Lägg till join code som query parameter om det finns
      if (joinCode) {
        authRedirectTo += `?join=${encodeURIComponent(joinCode)}`;
      } else if (redirectTo) {
        authRedirectTo += `?redirect=${encodeURIComponent(redirectTo)}`;
      }

      console.log('[GoogleLogin] Redirecting to:', authRedirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          ...(joinCode && {
            scopes: 'email profile'
          })
        }
      });

      if (error) {
        console.error('Google login error:', error);
        // Visa felmeddelande till användaren
        // Du kan implementera toast notification här
      }

    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setLocalLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {loading ? 'Loggar in...' : 'Fortsätt med Google'}
    </Button>
  );
} 