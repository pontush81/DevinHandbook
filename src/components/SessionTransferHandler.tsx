"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * SessionTransferHandler
 * 
 * This component handles session transfer when users are redirected from main domain
 * to subdomains with encoded session data in URL parameters.
 */
export function SessionTransferHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleSessionTransfer = async () => {
      const transferSession = searchParams.get('transfer_session');
      
      if (!transferSession) {
        // No session transfer needed
        return;
      }

      try {
        console.log('[Session Transfer] Processing session transfer...');
        
        // Decode session data
        const sessionData = JSON.parse(atob(transferSession));
        
        if (!sessionData.access_token || !sessionData.refresh_token) {
          console.error('[Session Transfer] Invalid session data received');
          return;
        }

        // Set the session in Supabase
        const { data, error } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token
        });

        if (error) {
          console.error('[Session Transfer] Error setting session:', error);
          return;
        }

        console.log('[Session Transfer] Session successfully transferred');

        // Clean up URL by removing transfer_session parameter
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('transfer_session');
        
        // Replace current URL without the session transfer parameter
        window.history.replaceState({}, document.title, currentUrl.toString());

      } catch (error) {
        console.error('[Session Transfer] Error processing session transfer:', error);
      }
    };

    handleSessionTransfer();
  }, [searchParams, router]);

  // This component doesn't render anything
  return null;
} 