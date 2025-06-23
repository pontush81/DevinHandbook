import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton pattern to ensure only one Supabase client instance
let supabaseInstance: SupabaseClient | null = null;
let isInitialized = false;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    console.log('🆕 Supabase: Creating new singleton instance');
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-auth-token',
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