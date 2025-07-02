import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton pattern to ensure only one Supabase client instance
let supabaseInstance: SupabaseClient | null = null;
let isInitialized = false;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    // console.log('🆕 Supabase: Creating new singleton instance');
    
    // Custom storage that syncs to both localStorage and cookies
    const customStorage = {
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null;
        
        // Try localStorage first
        try {
          const item = localStorage.getItem(key);
          if (item) return item;
        } catch (e) {
          console.warn('localStorage not available:', e);
        }
        
        // Fallback to cookie
        try {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === key && value) {
              return decodeURIComponent(value);
            }
          }
        } catch (e) {
          console.warn('Cookie access failed:', e);
        }
        
        return null;
      },
      
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        
        // Set in localStorage
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('localStorage setItem failed:', e);
        }
        
        // Also set as cookie for server-side access with proper domain handling
        try {
          // Detect production environment by hostname instead of NODE_ENV to avoid process dependency
          const hostname = window.location.hostname;
          const isProduction = hostname === 'www.handbok.org' || hostname === 'handbok.org' || hostname.endsWith('.handbok.org');
          const maxAge = 60 * 60 * 24 * 7; // 7 days
          
          // Determine correct domain for cookie
          let domain = '';
          if (isProduction) {
            // Set domain for handbok.org and its subdomains
            domain = '; Domain=.handbok.org';
          }
          // For development or other domains, let browser determine the domain
          
          const secure = isProduction && window.location.protocol === 'https:' ? '; Secure' : '';
          const sameSite = '; SameSite=Lax';
          
          const cookieString = `${key}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/${domain}${secure}${sameSite}`;
          document.cookie = cookieString;
          
          // Debug log for troubleshooting
          if (key.includes('auth-token')) {
            console.log('🍪 [Supabase Auth] Setting auth cookie:', {
              key: key.substring(0, 20) + '...',
              domain: domain || 'browser-default',
              secure: secure.length > 0,
              environment: isProduction ? 'production' : 'development',
              hostname: hostname
            });
          }
        } catch (e) {
          console.warn('Cookie setItem failed:', e);
        }
      },
      
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return;
        
        // Remove from localStorage
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('localStorage removeItem failed:', e);
        }
        
        // Remove cookie with proper domain handling
        try {
          const hostname = window.location.hostname;
          const isProduction = hostname === 'www.handbok.org' || hostname === 'handbok.org' || hostname.endsWith('.handbok.org');
          
          // Remove cookie without domain first (for current domain)
          document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
          
          // Also remove with domain if in production (for cross-subdomain cleanup)
          if (isProduction) {
            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=.handbok.org`;
          }
        } catch (e) {
          console.warn('Cookie removeItem failed:', e);
        }
      }
    };
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? customStorage : undefined,
        storageKey: 'sb-kjsquvjzctdwgjypcjrg-auth-token',
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-web'
        }
      }
    });
    
    isInitialized = true;
  }
  
  return supabaseInstance;
}

export function clearSupabaseStorage() {
  if (typeof window !== 'undefined') {
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('🧹 Cleared all Supabase storage and cookies');
  }
}

export function resetSupabaseClient() {
  if (typeof window !== 'undefined') {
    console.log('🔄 Resetting Supabase client completely...');
    
    // Clear the singleton instance
    supabaseInstance = null;
    isInitialized = false;
    
    // Clear all storage
    clearSupabaseStorage();
    
    // Force garbage collection of any hanging requests
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
    
    console.log('✅ Supabase client reset completed');
    
    // Create a fresh instance
    const freshClient = getSupabaseClient();
    console.log('🆕 Fresh Supabase client created');
    
    return freshClient;
  }
  return getSupabaseClient();
}

// Export the default instance
export const supabase = getSupabaseClient(); 