/**
 * Development utilities for debugging and fixing auth issues
 */

/**
 * Force clears all authentication data from browser storage
 * This is useful when a user has an invalid session (e.g., user exists in local storage but not in auth.users table)
 */
export function forceLogout() {
  if (typeof window === 'undefined') return;
  
  console.log('🚨 Force logout initiated - clearing all auth data');
  
  try {
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed localStorage key: ${key}`);
    });
    
    // Clear sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed sessionStorage key: ${key}`);
      }
    }
    
    // Clear cookies
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        
        if (window.location.hostname === 'localhost') {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
        }
        
        console.log(`🍪 Cleared cookie: ${name}`);
      }
    });
    
    // Set logout flag
    localStorage.setItem('__logout_flag__', Date.now().toString());
    
    console.log('✅ Force logout completed - please refresh the page');
    
    // Reload the page to clear all React state
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error during force logout:', error);
  }
}

// Make it available in the global scope for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).forceLogout = forceLogout;
} 