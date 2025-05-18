/**
 * Cross-Domain Storage Helper
 * 
 * This script helps solve the "Access to storage is not allowed from this context" error
 * when accessing localStorage/sessionStorage across different subdomains.
 * 
 * Version: 3.0
 */

(function() {
  // Check if running in browser environment
  if (typeof window === 'undefined') return;

  console.log('[Storage Helper] Initializing cross-domain storage helper v3.0');
  
  // Debug flag - enable for verbose logging
  const DEBUG = false;
  
  function debug(...args) {
    if (DEBUG) console.log('[Storage Helper]', ...args);
  }
  
  // Track storage errors
  let storageErrorCount = 0;
  const MAX_STORAGE_ERRORS = 5;
  
  // Create a wrapper for storage operations that handles exceptions
  const createSafeStorage = (storageType) => {
    const storage = window[storageType];
    
    return {
      getItem: function(key) {
        try {
          return storage.getItem(key);
        } catch (e) {
          storageErrorCount++;
          console.warn(`[Storage Helper] ${storageType} access failed:`, e.message);
          return null;
        }
      },
      setItem: function(key, value) {
        try {
          storage.setItem(key, value);
          return true;
        } catch (e) {
          storageErrorCount++;
          console.warn(`[Storage Helper] ${storageType} write failed:`, e.message);
          
          // Try fallback for critical auth keys using cookies
          if (key.includes('auth') && typeof document !== 'undefined') {
            try {
              document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=86400;domain=handbok.org;`;
              return true;
            } catch (cookieErr) {
              console.warn('[Storage Helper] Cookie fallback failed:', cookieErr.message);
            }
          }
          
          return false;
        }
      },
      removeItem: function(key) {
        try {
          storage.removeItem(key);
          return true;
        } catch (e) {
          storageErrorCount++;
          console.warn(`[Storage Helper] ${storageType} removal failed:`, e.message);
          return false;
        }
      },
      clear: function() {
        try {
          storage.clear();
          return true;
        } catch (e) {
          storageErrorCount++;
          console.warn(`[Storage Helper] ${storageType} clear failed:`, e.message);
          return false;
        }
      },
      key: function(index) {
        try {
          return storage.key(index);
        } catch (e) {
          storageErrorCount++;
          console.warn(`[Storage Helper] ${storageType} key access failed:`, e.message);
          return null;
        }
      },
      length: function() {
        try {
          return storage.length;
        } catch (e) {
          storageErrorCount++;
          console.warn(`[Storage Helper] ${storageType} length access failed:`, e.message);
          return 0;
        }
      }
    };
  };

  // Create safe versions of localStorage and sessionStorage
  window.safeLocalStorage = createSafeStorage('localStorage');
  window.safeSessionStorage = createSafeStorage('sessionStorage');
  
  // Memory fallback storage for critical operations
  const memoryStorage = new Map();
  
  // In-memory fallback storage API
  window.memoryStorage = {
    getItem: function(key) {
      return memoryStorage.get(key) || null;
    },
    setItem: function(key, value) {
      memoryStorage.set(key, value);
      return true;
    },
    removeItem: function(key) {
      memoryStorage.delete(key);
      return true;
    },
    clear: function() {
      memoryStorage.clear();
      return true;
    }
  };
  
  // Cookie-based storage helper as another fallback
  window.cookieStorage = {
    getItem: function(key) {
      try {
        const nameEQ = key + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
      } catch (e) {
        console.warn('[Storage Helper] Cookie read failed:', e.message);
        return null;
      }
    },
    setItem: function(key, value, days = 7) {
      try {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();
        document.cookie = key + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;domain=.handbok.org";
        return true;
      } catch (e) {
        console.warn('[Storage Helper] Cookie write failed:', e.message);
        return false;
      }
    },
    removeItem: function(key) {
      try {
        document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.handbok.org";
        return true;
      } catch (e) {
        console.warn('[Storage Helper] Cookie removal failed:', e.message);
        return false;
      }
    }
  };
  
  // Special handling for Supabase auth
  // Try multiple storage mechanisms for resilience
  window.supabaseStorage = {
    getSession: function() {
      // Try multiple storage options in order
      return window.safeLocalStorage.getItem('supabase.auth.token') || 
             window.cookieStorage.getItem('supabase.auth.token') || 
             window.memoryStorage.getItem('supabase.auth.token');
    },
    setSession: function(token) {
      // Store in all available storage mechanisms
      const localResult = window.safeLocalStorage.setItem('supabase.auth.token', token);
      const cookieResult = window.cookieStorage.setItem('supabase.auth.token', token);
      const memoryResult = window.memoryStorage.setItem('supabase.auth.token', token);
      
      // Return true if at least one storage method worked
      return localResult || cookieResult || memoryResult;
    },
    clearSession: function() {
      window.safeLocalStorage.removeItem('supabase.auth.token');
      window.cookieStorage.removeItem('supabase.auth.token');
      window.memoryStorage.removeItem('supabase.auth.token');
      return true;
    }
  };
  
  // Storage access status check - expose this for the application to use
  window.storageAccessStatus = {
    hasAccess: storageErrorCount < MAX_STORAGE_ERRORS,
    errorCount: storageErrorCount,
    check: function() {
      try {
        const testKey = '_storage_test_' + Math.random();
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    }
  };
  
  // Setup cross-domain auth and storage handling
  const setupCrossDomainStorage = () => {
    const mainDomain = 'handbok.org';
    const currentDomain = window.location.hostname;
    
    // Only set up cross-domain storage if we're on a subdomain
    const isSubdomain = currentDomain !== mainDomain && 
                       currentDomain !== 'www.handbok.org' &&
                       currentDomain.endsWith('.handbok.org');
    
    if (!isSubdomain) {
      debug('Not a subdomain, using local storage directly');
      return;
    }
    
    debug('Running on subdomain, setting up cross-domain storage');
    
    // Track storage bridge iframe status
    const BRIDGE_STATUS = {
      loading: true,
      available: false,
      error: null,
      created: false
    };
    
    // Create the storage bridge iframe if it doesn't exist
    function ensureStorageBridge() {
      if (BRIDGE_STATUS.created) return;
      
      const existingIframe = document.querySelector('iframe[src*="storage-bridge.html"]');
      
      if (!existingIframe) {
        debug('Creating storage bridge iframe');
        const iframe = document.createElement('iframe');
        iframe.src = `https://${mainDomain}/storage-bridge.html`;
        iframe.style.display = 'none';
        iframe.title = 'Storage Bridge';
        iframe.id = 'storage-bridge-frame';
        
        document.body ? 
          document.body.appendChild(iframe) : 
          window.addEventListener('DOMContentLoaded', () => document.body.appendChild(iframe));
        
        BRIDGE_STATUS.created = true;
      } else {
        debug('Storage bridge iframe already exists');
        BRIDGE_STATUS.created = true;
      }
    }
    
    // Try to ensure the storage bridge exists
    if (document.body) {
      ensureStorageBridge();
    } else {
      window.addEventListener('DOMContentLoaded', ensureStorageBridge);
    }
    
    // Create a simple cross-domain storage API that works with both iframe and direct methods
    window.crossDomainStorage = {
      getItem: async function(key) {
        debug('Getting item:', key);
        
        // First try direct storage
        const directValue = window.safeLocalStorage.getItem(key);
        if (directValue !== null) {
          debug('Retrieved from direct storage:', key);
          return directValue;
        }
        
        // Then try memory storage
        const memoryValue = window.memoryStorage.getItem(key);
        if (memoryValue !== null) {
          debug('Retrieved from memory storage:', key);
          return memoryValue;
        }
        
        // Then try cookie storage
        const cookieValue = window.cookieStorage.getItem(key);
        if (cookieValue !== null) {
          debug('Retrieved from cookie storage:', key);
          return cookieValue;
        }
        
        // Bridge may not be ready yet
        ensureStorageBridge();
        
        return null;
      },
      
      setItem: async function(key, value) {
        debug('Setting item:', key);
        
        // Try all storage mechanisms
        const directResult = window.safeLocalStorage.setItem(key, value);
        const memoryResult = window.memoryStorage.setItem(key, value);
        const cookieResult = window.cookieStorage.setItem(key, value);
        
        // Bridge may not be ready yet
        ensureStorageBridge();
        
        // Return true if any storage mechanism worked
        return directResult || memoryResult || cookieResult;
      },
      
      removeItem: async function(key) {
        debug('Removing item:', key);
        
        // Remove from all storage mechanisms
        window.safeLocalStorage.removeItem(key);
        window.memoryStorage.removeItem(key);
        window.cookieStorage.removeItem(key);
        
        // Bridge may not be ready yet
        ensureStorageBridge();
        
        return true;
      }
    };
    
    debug('Cross-domain storage setup complete');
  };
  
  // Initialize
  setupCrossDomainStorage();
  
  // Export a unified storage API that tries all methods
  window.unifiedStorage = {
    getItem: function(key) {
      return window.safeLocalStorage.getItem(key) || 
             window.memoryStorage.getItem(key) || 
             window.cookieStorage.getItem(key);
    },
    setItem: function(key, value) {
      const localResult = window.safeLocalStorage.setItem(key, value);
      const memoryResult = window.memoryStorage.setItem(key, value);
      const cookieResult = window.cookieStorage.setItem(key, value);
      return localResult || memoryResult || cookieResult;
    },
    removeItem: function(key) {
      window.safeLocalStorage.removeItem(key);
      window.memoryStorage.removeItem(key);
      window.cookieStorage.removeItem(key);
      return true;
    }
  };
  
  console.log('[Storage Helper] Storage helper initialization complete');
})(); 