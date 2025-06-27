import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/safe-storage';

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
      navigateWithCleanUrl('/dashboard');
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
        console.log(`[Redirect to New Handbook] ✅ Executing navigateWithCleanUrl redirect...`);
        navigateWithCleanUrl(handbookUrl);
      } else {
        console.error(`[Redirect to New Handbook] ❌ Window object not available for redirect`);
      }
    } else {
      // Production: use new URL structure (www.handbok.org/namn)
      console.log(`[Redirect to New Handbook] 🌐 Production environment detected`);
      const handbookUrl = `https://www.handbok.org/${subdomain}`;
      console.log(`[Redirect to New Handbook] ⚡ Redirecting to new URL structure: ${handbookUrl}`);
      
      if (typeof window !== 'undefined') {
        navigateWithCleanUrl(handbookUrl);
      } else {
        console.error(`[Redirect to New Handbook] ❌ Window object not available for redirect`);
      }
    }
  } catch (error) {
    console.error('[Redirect to New Handbook] Error during redirect:', error);
    // Fallback to dashboard
    console.log('[Redirect to New Handbook] Falling back to dashboard');
    navigateWithCleanUrl('/dashboard');
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
    
    navigateWithCleanUrl(handbookUrl);
    
  } catch (error) {
    console.error('[Transfer Session] ❌ Error during redirect:', error);
    // Fallback to direct redirect
    console.log('[Transfer Session] 🔄 Falling back to dashboard');
    navigateWithCleanUrl('/dashboard');
  }
}

// Throttling for smartRedirect to prevent multiple rapid calls
let lastRedirectTime = 0;
const REDIRECT_THROTTLE_MS = 2000; // 2 seconds

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
  // Throttle rapid calls to prevent multiple redirects
  const now = Date.now();
  if (now - lastRedirectTime < REDIRECT_THROTTLE_MS) {
    console.log('[Smart Redirect] Throttled - too soon since last redirect');
    return;
  }
  lastRedirectTime = now;

  try {
    // Check if user is on create-handbook page - don't redirect
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/create-handbook')) {
        console.log('[Smart Redirect] User is on create-handbook page, skipping redirect');
        return;
      }
      
      // Also check for global flag set by create-handbook page
      if ((window as any).__CREATE_HANDBOOK_PAGE) {
        console.log('[Smart Redirect] Create handbook page flag is set, skipping redirect');
        return;
      }
    }

    // Check if user is currently joining a handbook via code - if so, don't interfere
    if (typeof window !== 'undefined') {
      let joiningFlag = null;
      let pendingJoinCode = null;
      let joinProcessStarted = null;
      
      // Safe localStorage access
      joiningFlag = safeLocalStorage.getItem('joining_handbook_via_code');
      pendingJoinCode = safeLocalStorage.getItem('pending_join_code');
      joinProcessStarted = safeLocalStorage.getItem('join_process_started');
      
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
            safeLocalStorage.removeItem('joining_handbook_via_code');
            safeLocalStorage.removeItem('pending_join_code');
            safeLocalStorage.removeItem('join_process_started');
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
      navigateWithCleanUrl('/dashboard');
      return;
    }

    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (!userId) {
              console.log('[Smart Redirect] No user found, redirecting to create-handbook for onboarding');
        navigateWithCleanUrl('/create-handbook?new=true');
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
      navigateWithCleanUrl('/dashboard');
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
      navigateWithCleanUrl('/create-handbook');
      return;
    }

    if (uniqueHandbooks.length === 1) {
      const handbook = uniqueHandbooks[0] as any;
      // Validate slug before redirect
      if (!handbook || !handbook.slug || typeof handbook.slug !== 'string') {
        console.error('[Smart Redirect] Invalid handbook or slug:', handbook);
        console.log('[Smart Redirect] Falling back to dashboard due to invalid slug');
        navigateWithCleanUrl('/dashboard');
        return;
      }

      console.log(`[Smart Redirect] One handbook found, redirecting to: ${handbook.slug}`);
      
      const handbookUrl = process.env.NODE_ENV === 'development'
        ? `http://localhost:3000/${handbook.slug}`  // Map slug to subdomain for URL
        : `https://www.handbok.org/${handbook.slug}`;
      
      navigateWithCleanUrl(handbookUrl);
      return;
    }

    // Multiple handbooks - go to dashboard
    console.log(`[Smart Redirect] Multiple handbooks found (${uniqueHandbooks.length}), redirecting to dashboard`);
    navigateWithCleanUrl('/dashboard');
  } catch (error) {
    console.error('[Smart Redirect] Unexpected error:', error);
    // Fallback to create-handbook for better onboarding experience
    navigateWithCleanUrl('/create-handbook?new=true');
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
  
  // console.log(`[Smart Redirect Polling] Starting with maxAttempts: ${maxAttempts}, intervalMs: ${intervalMs}, userId: ${userId}, isSuperAdmin: ${isSuperAdmin}`);
  
  // Global check to prevent redirects when on create-handbook page
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/create-handbook')) {
      console.log('[Smart Redirect Polling] GLOBAL BLOCK - User is on create-handbook page, completely blocking redirect');
      return;
    }
    
    // Also check for global flag set by create-handbook page
    if ((window as any).__CREATE_HANDBOOK_PAGE) {
      console.log('[Smart Redirect Polling] GLOBAL BLOCK - Create handbook page flag is set, completely blocking redirect');
      return;
    }
  }
  
  // Check if user is on upgrade page, create-handbook page, or intended to go to upgrade - if so, don't redirect
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    const intendedPage = sessionStorage.getItem('intended_page');
    
    // console.log(`[Smart Redirect Polling] INITIAL CHECK - Current path: "${currentPath}", Current URL: "${currentUrl}", Intended page: "${intendedPage}"`);
    
    if (currentPath === '/upgrade' || intendedPage === '/upgrade') {
      console.log('[Smart Redirect Polling] EARLY EXIT - User is on upgrade page or intended to go to upgrade, skipping redirect');
              // If user intended to go to upgrade but is not there, redirect them back
        if (intendedPage === '/upgrade' && currentPath !== '/upgrade') {
          console.log('[Smart Redirect Polling] REDIRECTING BACK - Redirecting back to intended upgrade page');
          sessionStorage.removeItem('intended_page');
          navigateWithCleanUrl('/upgrade');
        }
      return;
    }
    
    // Check if user is on create-handbook page - don't redirect
    if (currentPath === '/create-handbook') {
      console.log('[Smart Redirect Polling] EARLY EXIT - User is on create-handbook page, skipping redirect');
      return;
    }
    
    // Also check for create-handbook with query parameters
    if (currentPath.startsWith('/create-handbook')) {
      console.log('[Smart Redirect Polling] EARLY EXIT - User is on create-handbook page (with params), skipping redirect');
      return;
    }
    
    // Extra safety check for any create-handbook related URLs
    if (currentUrl.includes('/create-handbook')) {
      console.log('[Smart Redirect Polling] EARLY EXIT - URL contains create-handbook, skipping redirect');
      return;
    }
    
    // Also check for any URL that contains upgrade
    if (currentPath.includes('/upgrade')) {
      console.log('[Smart Redirect Polling] User is on upgrade-related page, skipping redirect');
      return;
    }
  }
  
  const attemptRedirect = async (): Promise<void> => {
    attempts++;
    // console.log(`[Smart Redirect Polling] Attempt ${attempts}/${maxAttempts}`);
    
    try {
      // Check if user is currently joining a handbook via code - if so, don't interfere
      if (typeof window !== 'undefined') {
        let joiningFlag = null;
        let pendingJoinCode = null;
        
        // Safe localStorage access
        joiningFlag = safeLocalStorage.getItem('joining_handbook_via_code');
        pendingJoinCode = safeLocalStorage.getItem('pending_join_code');
        
        const windowJoiningFlag = (window as any).__joining_handbook;
        
        // console.log('[Smart Redirect Polling] Checking joining flags:', { 
        //   joiningFlag, 
        //   pendingJoinCode, 
        //   windowJoiningFlag 
        // });
        
        if (joiningFlag === 'true' || pendingJoinCode || windowJoiningFlag) {
          console.log('[Smart Redirect Polling] User is joining handbook via code, skipping redirect');
          return;
        }
      }

      // Super admins always go to dashboard for overview
      if (isSuperAdmin) {
        console.log('[Smart Redirect Polling] Super admin detected, redirecting to dashboard');
        navigateWithCleanUrl('/dashboard');
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
          navigateWithCleanUrl('/create-handbook?new=true');
        } else {
          console.log(`[Smart Redirect Polling] Retrying in ${intervalMs}ms...`);
          setTimeout(attemptRedirect, intervalMs);
        }
        return;
      }

      // console.log(`[Smart Redirect Polling] Attempt ${attempts}: Fetching handbooks for user: ${userId}`);
      
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
          navigateWithCleanUrl('/create-handbook?new=true');
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
          navigateWithCleanUrl('/create-handbook?new=true');
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
          navigateWithCleanUrl('/dashboard');
          return;
        }
        
        // Use new URL structure (www.handbok.org/namn)
        const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const handbookUrl = isDevelopment 
          ? `http://localhost:3000/${handbook.slug}`
          : `https://www.handbok.org/${handbook.slug}`;
        
        console.log(`[Smart Redirect Polling] Redirecting to: ${handbookUrl}`);
        navigateWithCleanUrl(handbookUrl);
        return;
        
      } else {
        console.log(`[Smart Redirect Polling] Multiple handbooks found (${handbookCount}), redirecting to dashboard`);
        navigateWithCleanUrl('/dashboard');
      }
      
    } catch (error) {
      console.error(`[Smart Redirect Polling] Attempt ${attempts}: Unexpected error:`, error);
      if (attempts >= maxAttempts) {
        console.log('[Smart Redirect Polling] Max attempts reached due to error, falling back to create-handbook for onboarding');
        navigateWithCleanUrl('/create-handbook?new=true');
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

/**
 * Clean OAuth parameters from URL to avoid carrying them over to other pages
 */
function cleanOAuthParametersFromUrl(): string {
  if (typeof window === 'undefined') return '';
  
  const url = new URL(window.location.href);
  
  // Remove common OAuth parameters
  const oauthParams = [
    'code', 'state', 'scope', 'authuser', 'hd', 'prompt',
    'access_token', 'expires_in', 'provider_token', 'provider_refresh_token',
    'token_type', 'refresh_token'
  ];
  
  oauthParams.forEach(param => {
    url.searchParams.delete(param);
  });
  
  // Also clean hash parameters (for OAuth flows that use hash)
  url.hash = '';
  
  return url.toString();
}

/**
 * Navigate to a URL with clean OAuth parameters
 */
function navigateWithCleanUrl(targetUrl: string): void {
  if (typeof window === 'undefined') return;
  
  // If target URL contains OAuth params, clean them
  const url = new URL(targetUrl, window.location.origin);
  const oauthParams = [
    'code', 'state', 'scope', 'authuser', 'hd', 'prompt',
    'access_token', 'expires_in', 'provider_token', 'provider_refresh_token',
    'token_type', 'refresh_token'
  ];
  
  oauthParams.forEach(param => {
    url.searchParams.delete(param);
  });
  
  window.location.href = url.toString();
} 