import { supabase } from '@/lib/supabase';

interface Handbook {
  id: string;
  subdomain: string; // This maps to 'slug' in database but keeping interface consistent
  title: string;
}

/**
 * Redirect directly to a specific handbook after creation
 * Always goes to the specified handbook regardless of user's total handbook count
 */
export async function redirectToNewlyCreatedHandbook(subdomain: string): Promise<void> {
  try {
    console.log(`[Redirect to New Handbook] 🚀 Starting redirect process for subdomain: ${subdomain}`);
    
    // Validate subdomain parameter
    if (!subdomain || typeof subdomain !== 'string' || subdomain.trim() === '') {
      console.error(`[Redirect to New Handbook] ❌ Invalid subdomain parameter: ${subdomain}`);
      console.log(`[Redirect to New Handbook] Falling back to dashboard`);
      window.location.href = '/dashboard';
      return;
    }
    
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
 * Get URL for a handbook based on environment
 */
export function getHandbookUrl(subdomain: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:3000/${subdomain}`;
  } else {
    return `https://www.handbok.org/${subdomain}`;
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
 * - 0 handbooks: Go to create-handbook (improved onboarding)
 * - 1 handbook: Go directly to the handbook (most users)
 * - Multiple handbooks: Go to dashboard (to choose)
 * 
 * @param userId - Optional user ID for superadmin check
 * @param isSuperAdmin - Optional flag to force dashboard for superadmins
 */
export async function smartRedirect(userId?: string, isSuperAdmin: boolean = false): Promise<void> {
  try {
    // Check if user is currently joining a handbook via code - if so, don't interfere
    if (typeof window !== 'undefined') {
      const joiningFlag = localStorage.getItem('joining_handbook_via_code');
      const pendingJoinCode = localStorage.getItem('pending_join_code');
      const joinProcessStarted = localStorage.getItem('join_process_started');
      const windowJoiningFlag = (window as any).__joining_handbook;
      
      console.log('[Smart Redirect] Checking join flags:', { 
        joiningFlag, 
        pendingJoinCode, 
        joinProcessStarted,
        windowJoiningFlag 
      });
      
      if (joiningFlag === 'true' || pendingJoinCode || joinProcessStarted || windowJoiningFlag) {
        // Check if join process is stale (older than 5 minutes)
        if (joinProcessStarted) {
          const startTime = parseInt(joinProcessStarted);
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          if (startTime < fiveMinutesAgo && !windowJoiningFlag) {
            console.log('[Smart Redirect] Join process is stale, clearing flags and continuing');
            localStorage.removeItem('joining_handbook_via_code');
            localStorage.removeItem('pending_join_code');
            localStorage.removeItem('join_process_started');
            delete (window as any).__joining_handbook;
          } else {
            console.log('[Smart Redirect] User is joining handbook via code, skipping redirect');
            return;
          }
        } else {
          console.log('[Smart Redirect] User is joining handbook via code, skipping redirect');
          return;
        }
      }
    }

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
      console.log('[Smart Redirect] No user found, redirecting to create-handbook for onboarding');
      window.location.href = '/create-handbook?new=true';
      return;
    }

    console.log(`[Smart Redirect] Fetching handbooks for user: ${userId}`);

    // Get user's handbooks (both owned and member of)
    const [ownedHandbooks, memberHandbooks] = await Promise.all([
      // Handbooks user owns
      (supabase as any)
        .from('handbooks')
        .select('id, slug, title')
        .eq('owner_id', userId)
        .limit(5),
      
      // Handbooks user is member of
      (supabase as any)
        .from('handbook_members')
        .select(`
          handbook_id,
          handbooks!inner(id, slug, title)
        `)
        .eq('user_id', userId)
        .limit(5)
    ]);

    if (ownedHandbooks.error && memberHandbooks.error) {
      console.error('[Smart Redirect] Error fetching handbooks:', { 
        ownedError: ownedHandbooks.error,
        memberError: memberHandbooks.error 
      });
      console.log('[Smart Redirect] Falling back to dashboard due to error');
      window.location.href = '/dashboard';
      return;
    }

    // Combine and deduplicate handbooks
    const allHandbooks = [
      ...(ownedHandbooks.data || []),
      ...(memberHandbooks.data || []).map((m: any) => m.handbooks)
    ];
    
    // Remove duplicates based on ID
    const uniqueHandbooks = allHandbooks.filter((handbook, index, self) => 
      index === self.findIndex(h => h.id === handbook.id)
    );

    console.log(`[Smart Redirect] Found ${uniqueHandbooks.length} total handbooks for user ${userId}:`, 
      uniqueHandbooks?.map((h: any) => h.slug));

    if (!uniqueHandbooks || uniqueHandbooks.length === 0) {
      console.log('[Smart Redirect] No handbooks found, redirecting to create handbook');
      window.location.href = '/create-handbook';
      return;
    }

    if (uniqueHandbooks.length === 1) {
      const handbook = uniqueHandbooks[0] as any;
      // Validate slug before redirect
      if (!handbook || !handbook.slug || typeof handbook.slug !== 'string') {
        console.error('[Smart Redirect] Invalid handbook or slug:', handbook);
        console.log('[Smart Redirect] Falling back to dashboard due to invalid slug');
        window.location.href = '/dashboard';
        return;
      }

      console.log(`[Smart Redirect] One handbook found, redirecting to: ${handbook.slug}`);
      
      const handbookUrl = process.env.NODE_ENV === 'development'
        ? `http://localhost:3000/${handbook.slug}`  // Map slug to subdomain for URL
        : `https://www.handbok.org/${handbook.slug}`;
      
      window.location.href = handbookUrl;
      return;
    }

    // Multiple handbooks - go to dashboard
    console.log(`[Smart Redirect] Multiple handbooks found (${uniqueHandbooks.length}), redirecting to dashboard`);
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('[Smart Redirect] Unexpected error:', error);
    // Fallback to create-handbook for better onboarding experience
    window.location.href = '/create-handbook?new=true';
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
      // Check if user is currently joining a handbook via code - if so, don't interfere
      if (typeof window !== 'undefined') {
        const joiningFlag = localStorage.getItem('joining_handbook_via_code');
        const pendingJoinCode = localStorage.getItem('pending_join_code');
        const windowJoiningFlag = (window as any).__joining_handbook;
        
        console.log('[Smart Redirect Polling] Checking joining flags:', { 
          joiningFlag, 
          pendingJoinCode, 
          windowJoiningFlag 
        });
        
        if (joiningFlag === 'true' || pendingJoinCode || windowJoiningFlag) {
          console.log('[Smart Redirect Polling] User is joining handbook via code, skipping redirect');
          return;
        }
      }

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
          console.log('[Smart Redirect Polling] Max attempts reached with no user, redirecting to create-handbook for onboarding');
          window.location.href = '/create-handbook?new=true';
        } else {
          console.log(`[Smart Redirect Polling] Retrying in ${intervalMs}ms...`);
          setTimeout(attemptRedirect, intervalMs);
        }
        return;
      }

      console.log(`[Smart Redirect Polling] Attempt ${attempts}: Fetching handbooks for user: ${userId}`);
      
      // Fetch user's handbooks (both owned and member of)
      const [ownedHandbooks, memberHandbooks] = await Promise.all([
        // Handbooks user owns
        (supabase as any)
          .from('handbooks')
          .select('id, slug, title')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false }),
        
        // Handbooks user is member of
        (supabase as any)
          .from('handbook_members')
          .select(`
            handbook_id,
            handbooks!inner(id, slug, title)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      if (ownedHandbooks.error && memberHandbooks.error) {
        console.error(`[Smart Redirect Polling] Attempt ${attempts}: Error fetching handbooks:`, {
          ownedError: ownedHandbooks.error,
          memberError: memberHandbooks.error
        });
        if (attempts >= maxAttempts) {
          console.log('[Smart Redirect Polling] Max attempts reached, falling back to create-handbook for onboarding');
          window.location.href = '/create-handbook?new=true';
        } else {
          console.log(`[Smart Redirect Polling] Retrying in ${intervalMs}ms...`);
          setTimeout(attemptRedirect, intervalMs);
        }
        return;
      }

      // Combine and deduplicate handbooks
      const allHandbooks = [
        ...(ownedHandbooks.data || []),
        ...(memberHandbooks.data || []).map((m: any) => m.handbooks)
      ];
      
      // Remove duplicates based on ID
      const uniqueHandbooks = allHandbooks.filter((handbook, index, self) => 
        index === self.findIndex(h => h.id === handbook.id)
      );

      const handbookCount = uniqueHandbooks?.length || 0;
      console.log(`[Smart Redirect Polling] Attempt ${attempts}: Found ${handbookCount} total handbooks for user ${userId}:`, 
        uniqueHandbooks?.map((h: any) => h.slug));

      if (handbookCount === 0) {
        if (attempts >= maxAttempts) {
          console.log('[Smart Redirect Polling] Max attempts reached with no handbooks, redirecting to create-handbook for onboarding');
          window.location.href = '/create-handbook?new=true';
        } else {
          console.log('[Smart Redirect Polling] No handbooks yet, retrying...');
          setTimeout(attemptRedirect, intervalMs);
        }
        return;
        
      } else if (handbookCount === 1) {
        const handbook = uniqueHandbooks[0];
        console.log(`[Smart Redirect Polling] Found single handbook: ${handbook.slug}`);
        
        // Validate slug before redirect
        if (!handbook || !handbook.slug || typeof handbook.slug !== 'string') {
          console.error('[Smart Redirect Polling] Invalid handbook or slug:', handbook);
          console.log('[Smart Redirect Polling] Falling back to dashboard due to invalid slug');
          window.location.href = '/dashboard';
          return;
        }
        
        // Use new URL structure (www.handbok.org/namn)
        const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const handbookUrl = isDevelopment 
          ? `http://localhost:3000/${handbook.slug}`
          : `https://www.handbok.org/${handbook.slug}`;
        
        console.log(`[Smart Redirect Polling] Redirecting to: ${handbookUrl}`);
        window.location.href = handbookUrl;
        return;
        
      } else {
        console.log(`[Smart Redirect Polling] Multiple handbooks found (${handbookCount}), redirecting to dashboard`);
        window.location.href = '/dashboard';
      }
      
    } catch (error) {
      console.error(`[Smart Redirect Polling] Attempt ${attempts}: Unexpected error:`, error);
      if (attempts >= maxAttempts) {
        console.log('[Smart Redirect Polling] Max attempts reached due to error, falling back to create-handbook for onboarding');
        window.location.href = '/create-handbook?new=true';
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