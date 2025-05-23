import { supabase } from '@/lib/supabase';

interface Handbook {
  id: string;
  subdomain: string;
  title: string;
}

/**
 * Smart redirect logic based on user's handbooks
 * - 0 handbooks: Go to dashboard (to create first)
 * - 1 handbook: Go directly to the handbook (most users)
 * - Multiple handbooks: Go to dashboard (to choose)
 * 
 * @param userId - Optional user ID for superadmin check
 * @param isSuperAdmin - Optional flag to force dashboard for superadmins
 */
export async function smartRedirect(userId?: string, isSuperAdmin: boolean = false): Promise<void> {
  try {
    // Super admins always go to dashboard for overview
    if (isSuperAdmin) {
      console.log('Super admin detected, redirecting to dashboard');
      window.location.href = '/dashboard';
      return;
    }

    // Fetch user's handbooks
    const { data: handbooks, error } = await supabase
      .from('handbooks')
      .select('id, subdomain, title')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching handbooks for redirect:', error);
      // Fallback to dashboard on error
      window.location.href = '/dashboard';
      return;
    }

    const handbookCount = handbooks?.length || 0;
    
    console.log(`Smart redirect: Found ${handbookCount} handbooks`);

    if (handbookCount === 0) {
      // No handbooks - go to dashboard to create first one
      console.log('No handbooks found, redirecting to dashboard');
      window.location.href = '/dashboard';
      
    } else if (handbookCount === 1) {
      // One handbook - go directly to it (most common case)
      const handbook = handbooks[0];
      console.log(`One handbook found, redirecting to: ${handbook.subdomain}.handbok.org`);
      
      // Use appropriate domain based on environment
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const handbookUrl = isDevelopment 
        ? `http://localhost:3000/handbook/${handbook.subdomain}`
        : `https://${handbook.subdomain}.handbok.org`;
      
      window.location.href = handbookUrl;
      
    } else {
      // Multiple handbooks - go to dashboard to choose
      console.log(`Multiple handbooks (${handbookCount}) found, redirecting to dashboard`);
      window.location.href = '/dashboard';
    }
    
  } catch (error) {
    console.error('Unexpected error in smart redirect:', error);
    // Fallback to dashboard on any error
    window.location.href = '/dashboard';
  }
}

/**
 * Smart redirect with robust polling for cases where database might need time to sync
 * Used after operations like handbook creation
 */
export async function smartRedirectWithPolling(
  maxAttempts: number = 5, 
  intervalMs: number = 800,
  userId?: string,
  isSuperAdmin: boolean = false
): Promise<void> {
  let attempts = 0;
  
  console.log(`[Smart Redirect] Starting with maxAttempts: ${maxAttempts}, intervalMs: ${intervalMs}, userId: ${userId}, isSuperAdmin: ${isSuperAdmin}`);
  
  const attemptRedirect = async (): Promise<void> => {
    attempts++;
    console.log(`[Smart Redirect] Attempt ${attempts}/${maxAttempts}`);
    
    try {
      // Super admins always go to dashboard
      if (isSuperAdmin) {
        console.log('[Smart Redirect] Super admin detected, redirecting to dashboard');
        window.location.href = '/dashboard';
        return;
      }

      console.log('[Smart Redirect] Fetching user handbooks...');
      const { data: handbooks, error } = await supabase
        .from('handbooks')
        .select('id, subdomain, title')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[Smart Redirect] Attempt ${attempts}: Error fetching handbooks:`, error);
        if (attempts >= maxAttempts) {
          console.log('[Smart Redirect] Max attempts reached, falling back to dashboard');
          window.location.href = '/dashboard';
        } else {
          console.log(`[Smart Redirect] Retrying in ${intervalMs}ms...`);
          setTimeout(attemptRedirect, intervalMs);
        }
        return;
      }

      const handbookCount = handbooks?.length || 0;
      console.log(`[Smart Redirect] Attempt ${attempts}: Found ${handbookCount} handbooks:`, handbooks?.map(h => h.subdomain));

      if (handbookCount === 0) {
        if (attempts >= maxAttempts) {
          console.log('[Smart Redirect] Max attempts reached with no handbooks, redirecting to dashboard');
          window.location.href = '/dashboard';
        } else {
          console.log('[Smart Redirect] No handbooks yet, retrying...');
          setTimeout(attemptRedirect, intervalMs);
        }
        
      } else if (handbookCount === 1) {
        const handbook = handbooks[0];
        console.log(`[Smart Redirect] Found single handbook: ${handbook.subdomain}`);
        
        // Use appropriate domain based on environment
        const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const handbookUrl = isDevelopment 
          ? `http://localhost:3000/handbook/${handbook.subdomain}`
          : `https://${handbook.subdomain}.handbok.org`;
        
        console.log(`[Smart Redirect] Redirecting to: ${handbookUrl}`);
        window.location.href = handbookUrl;
        
      } else {
        console.log(`[Smart Redirect] Multiple handbooks found (${handbookCount}), redirecting to dashboard`);
        window.location.href = '/dashboard';
      }
      
    } catch (error) {
      console.error(`[Smart Redirect] Attempt ${attempts}: Unexpected error:`, error);
      if (attempts >= maxAttempts) {
        console.log('[Smart Redirect] Max attempts reached due to error, falling back to dashboard');
        window.location.href = '/dashboard';
      } else {
        console.log(`[Smart Redirect] Retrying after error in ${intervalMs}ms...`);
        setTimeout(attemptRedirect, intervalMs);
      }
    }
  };

  // Start the polling
  console.log('[Smart Redirect] Starting polling...');
  attemptRedirect();
} 