import { supabase } from '@/lib/supabase';

interface Handbook {
  id: string;
  subdomain: string;
  title: string;
}

/**
 * Redirect directly to a specific handbook after creation
 * Always goes to the specified handbook regardless of user's total handbook count
 */
export async function redirectToNewlyCreatedHandbook(subdomain: string): Promise<void> {
  try {
    console.log(`[Redirect to New Handbook] 🚀 Starting redirect process for subdomain: ${subdomain}`);
    
    // Use appropriate domain based on environment
    const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    
    console.log(`[Redirect to New Handbook] Environment check - isDevelopment: ${isDevelopment}`);
    console.log(`[Redirect to New Handbook] Current hostname: ${typeof window !== 'undefined' ? window.location.hostname : 'unknown'}`);
    
    if (isDevelopment) {
      // In development, use localhost:3000/namn (new URL structure)
      const handbookUrl = `http://localhost:3000/${subdomain}`;
      console.log(`[Redirect to New Handbook] 🏠 Development redirect to: ${handbookUrl}`);
      
      if (typeof window !== 'undefined') {
        console.log(`[Redirect to New Handbook] ✅ Executing window.location.href redirect...`);
        window.location.href = handbookUrl;
      } else {
        console.error(`[Redirect to New Handbook] ❌ Window object not available for redirect`);
      }
    } else {
      // Production: use new URL structure (www.handbok.org/namn)
      console.log(`[Redirect to New Handbook] 🌐 Production environment detected`);
      const handbookUrl = `https://www.handbok.org/${subdomain}`;
      console.log(`[Redirect to New Handbook] ⚡ Redirecting to new URL structure: ${handbookUrl}`);
      
      if (typeof window !== 'undefined') {
        window.location.href = handbookUrl;
      } else {
        console.error(`[Redirect to New Handbook] ❌ Window object not available for redirect`);
      }
    }
  } catch (error) {
    console.error('[Redirect to New Handbook] Error during redirect:', error);
    // Fallback to dashboard
    console.log('[Redirect to New Handbook] Falling back to dashboard');
    window.location.href = '/dashboard';
  }
}

/**
 * Transfer session to subdomain in production to avoid session loss
 * NOTE: This function is kept for backward compatibility but subdomains are no longer used
 */
async function transferSessionToSubdomain(subdomain: string): Promise<void> {
  try {
    console.log(`[Transfer Session] 🔄 NOTE: Subdomains are deprecated. Redirecting to main domain instead.`);
    
    // Redirect to main domain with new URL structure instead of subdomain
    const handbookUrl = `https://www.handbok.org/${subdomain}`;
    console.log(`[Transfer Session] 🚀 Redirecting to new URL structure: ${handbookUrl}`);
    
    window.location.href = handbookUrl;
    
  } catch (error) {
    console.error('[Transfer Session] ❌ Error during redirect:', error);
    // Fallback to direct redirect
    console.log('[Transfer Session] 🔄 Falling back to dashboard');
    window.location.href = '/dashboard';
  }
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
      console.log('[Smart Redirect] Super admin detected, redirecting to dashboard');
      window.location.href = '/dashboard';
      return;
    }

    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (!userId) {
      console.log('[Smart Redirect] No user found, redirecting to dashboard');
      window.location.href = '/dashboard';
      return;
    }

    console.log(`[Smart Redirect] Fetching handbooks for user: ${userId}`);

    // Fetch user's handbooks ONLY
    const { data: handbooks, error } = await supabase
      .from('handbooks')
      .select('id, subdomain, title')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Smart Redirect] Error fetching handbooks:', error);
      // Fallback to dashboard on error
      window.location.href = '/dashboard';
      return;
    }

    const handbookCount = handbooks?.length || 0;
    
    console.log(`[Smart Redirect] Found ${handbookCount} handbooks for user ${userId}:`, handbooks?.map(h => h.subdomain));

    if (handbookCount === 0) {
      // No handbooks - go to dashboard to create first one
      console.log('[Smart Redirect] No handbooks found, redirecting to dashboard');
      window.location.href = '/dashboard';
      
    } else if (handbookCount === 1) {
      // One handbook - go directly to it (most common case)
      const handbook = handbooks[0];
      console.log(`[Smart Redirect] One handbook found, redirecting to: ${handbook.subdomain}`);
      
      // Use new URL structure (www.handbok.org/namn)
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const handbookUrl = isDevelopment 
        ? `http://localhost:3000/${handbook.subdomain}`
        : `https://www.handbok.org/${handbook.subdomain}`;
      
      window.location.href = handbookUrl;
      
    } else {
      // Multiple handbooks - go to dashboard to choose
      console.log(`[Smart Redirect] Multiple handbooks (${handbookCount}) found, redirecting to dashboard`);
      window.location.href = '/dashboard';
    }
    
  } catch (error) {
    console.error('[Smart Redirect] Unexpected error:', error);
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
  
  console.log(`[Smart Redirect Polling] Starting with maxAttempts: ${maxAttempts}, intervalMs: ${intervalMs}, userId: ${userId}, isSuperAdmin: ${isSuperAdmin}`);
  
  const attemptRedirect = async (): Promise<void> => {
    attempts++;
    console.log(`[Smart Redirect Polling] Attempt ${attempts}/${maxAttempts}`);
    
    try {
      // Super admins always go to dashboard for overview
      if (isSuperAdmin) {
        console.log('[Smart Redirect Polling] Super admin detected, redirecting to dashboard');
        window.location.href = '/dashboard';
        return;
      }

      // Get current user if not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) {
        console.log(`[Smart Redirect Polling] Attempt ${attempts}: No user found`);
        if (attempts >= maxAttempts) {
          console.log('[Smart Redirect Polling] Max attempts reached with no user, redirecting to dashboard');
          window.location.href = '/dashboard';
        } else {
          console.log(`[Smart Redirect Polling] Retrying in ${intervalMs}ms...`);
          setTimeout(attemptRedirect, intervalMs);
        }
        return;
      }

      console.log(`[Smart Redirect Polling] Attempt ${attempts}: Fetching handbooks for user: ${userId}`);
      
      // Fetch user's handbooks ONLY
      const { data: handbooks, error } = await supabase
        .from('handbooks')
        .select('id, subdomain, title')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[Smart Redirect Polling] Attempt ${attempts}: Error fetching handbooks:`, error);
        if (attempts >= maxAttempts) {
          console.log('[Smart Redirect Polling] Max attempts reached, falling back to dashboard');
          window.location.href = '/dashboard';
        } else {
          console.log(`[Smart Redirect Polling] Retrying in ${intervalMs}ms...`);
          setTimeout(attemptRedirect, intervalMs);
        }
        return;
      }

      const handbookCount = handbooks?.length || 0;
      console.log(`[Smart Redirect Polling] Attempt ${attempts}: Found ${handbookCount} handbooks for user ${userId}:`, handbooks?.map(h => h.subdomain));

      if (handbookCount === 0) {
        if (attempts >= maxAttempts) {
          console.log('[Smart Redirect Polling] Max attempts reached with no handbooks, redirecting to dashboard');
          window.location.href = '/dashboard';
        } else {
          console.log('[Smart Redirect Polling] No handbooks yet, retrying...');
          setTimeout(attemptRedirect, intervalMs);
        }
        
      } else if (handbookCount === 1) {
        const handbook = handbooks[0];
        console.log(`[Smart Redirect Polling] Found single handbook: ${handbook.subdomain}`);
        
        // Use new URL structure (www.handbok.org/namn)
        const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const handbookUrl = isDevelopment 
          ? `http://localhost:3000/${handbook.subdomain}`
          : `https://www.handbok.org/${handbook.subdomain}`;
        
        console.log(`[Smart Redirect Polling] Redirecting to: ${handbookUrl}`);
        window.location.href = handbookUrl;
        
      } else {
        console.log(`[Smart Redirect Polling] Multiple handbooks found (${handbookCount}), redirecting to dashboard`);
        window.location.href = '/dashboard';
      }
      
    } catch (error) {
      console.error(`[Smart Redirect Polling] Attempt ${attempts}: Unexpected error:`, error);
      if (attempts >= maxAttempts) {
        console.log('[Smart Redirect Polling] Max attempts reached due to error, falling back to dashboard');
        window.location.href = '/dashboard';
      } else {
        console.log(`[Smart Redirect Polling] Retrying after error in ${intervalMs}ms...`);
        setTimeout(attemptRedirect, intervalMs);
      }
    }
  };

  // Start the polling
  console.log('[Smart Redirect Polling] Starting polling...');
  attemptRedirect();
} 