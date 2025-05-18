/**
 * Cross-Domain Storage Helper
 * 
 * This script helps solve the "Access to storage is not allowed from this context" error
 * when accessing localStorage/sessionStorage across different subdomains.
 * 
 * Version: 2.0
 */

(function() {
  // Check if running in browser environment
  if (typeof window === 'undefined') return;

  console.log('[Storage Helper] Initializing cross-domain storage helper');
  
  // Create a wrapper for storage operations that handles exceptions
  const createSafeStorage = (storageType) => {
    const storage = window[storageType];
    
    return {
      getItem: function(key) {
        try {
          return storage.getItem(key);
        } catch (e) {
          console.warn(`[Storage Helper] ${storageType} access failed:`, e.message);
          return null;
        }
      },
      setItem: function(key, value) {
        try {
          storage.setItem(key, value);
          return true;
        } catch (e) {
          console.warn(`[Storage Helper] ${storageType} write failed:`, e.message);
          return false;
        }
      },
      removeItem: function(key) {
        try {
          storage.removeItem(key);
          return true;
        } catch (e) {
          console.warn(`[Storage Helper] ${storageType} removal failed:`, e.message);
          return false;
        }
      },
      clear: function() {
        try {
          storage.clear();
          return true;
        } catch (e) {
          console.warn(`[Storage Helper] ${storageType} clear failed:`, e.message);
          return false;
        }
      },
      key: function(index) {
        try {
          return storage.key(index);
        } catch (e) {
          console.warn(`[Storage Helper] ${storageType} key access failed:`, e.message);
          return null;
        }
      },
      length: function() {
        try {
          return storage.length;
        } catch (e) {
          console.warn(`[Storage Helper] ${storageType} length access failed:`, e.message);
          return 0;
        }
      }
    };
  };

  // Create safe versions of localStorage and sessionStorage
  window.safeLocalStorage = createSafeStorage('localStorage');
  window.safeSessionStorage = createSafeStorage('sessionStorage');
  
  // Special handling for Supabase auth
  // This wraps common Supabase auth storage patterns
  window.supabaseStorage = {
    getSession: function() {
      return window.safeLocalStorage.getItem('supabase.auth.token');
    },
    setSession: function(token) {
      return window.safeLocalStorage.setItem('supabase.auth.token', token);
    },
    clearSession: function() {
      return window.safeLocalStorage.removeItem('supabase.auth.token');
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
      console.log('[Storage Helper] Not a subdomain, using local storage directly');
      return;
    }
    
    console.log('[Storage Helper] Running on subdomain, setting up cross-domain storage');
    
    // Setup auth bridge connection (iframe should already be in the DOM from layout.tsx)
    const AUTH_BRIDGE_READY = {
      promise: null,
      resolve: null,
      reject: null,
      timeout: null
    };
    
    // Create a promise to track when the auth bridge is ready
    AUTH_BRIDGE_READY.promise = new Promise((resolve, reject) => {
      AUTH_BRIDGE_READY.resolve = resolve;
      AUTH_BRIDGE_READY.reject = reject;
      
      // Set a timeout in case the bridge doesn't respond
      AUTH_BRIDGE_READY.timeout = setTimeout(() => {
        reject(new Error('Auth bridge connection timeout'));
      }, 5000);
    });
    
    // Create a map to track pending requests
    const pendingRequests = new Map();
    
    // Generate a unique request ID
    const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Listen for messages from the auth bridge
    window.addEventListener('message', function(event) {
      // Only accept messages from our domain (main domain or other subdomains)
      if (!event.origin.match(/^https?:\/\/(.*\.)?handbok\.org$/)) {
        return;
      }
      
      try {
        const data = event.data;
        
        // Ignore non-object messages
        if (!data || typeof data !== 'object') return;
        
        // Handle auth bridge ready response
        if (data.type === 'auth_pong') {
          clearTimeout(AUTH_BRIDGE_READY.timeout);
          AUTH_BRIDGE_READY.resolve(true);
          return;
        }
        
        // Handle auth status update
        if (data.type === 'auth_status') {
          // We could update UI elements here if needed
          return;
        }
        
        // Handle responses with request IDs
        if (data.request_id && pendingRequests.has(data.request_id)) {
          const { resolve, reject } = pendingRequests.get(data.request_id);
          pendingRequests.delete(data.request_id);
          
          if (data.type === 'auth_error') {
            reject(new Error(data.error || 'Unknown error'));
          } else if (data.type === 'auth_data') {
            resolve(data.value);
          } else if (data.type.endsWith('_done')) {
            resolve(true);
          }
        }
      } catch (e) {
        console.error('[Storage Helper] Error handling message from auth bridge:', e);
      }
    });
    
    // Helper to make requests to the auth bridge
    const makeAuthBridgeRequest = async (requestType, data = {}) => {
      try {
        // Ensure the auth bridge is ready
        await AUTH_BRIDGE_READY.promise;
        
        // Find the auth bridge iframe
        const authBridgeIframe = document.querySelector('iframe[src*="auth-bridge.html"]');
        if (!authBridgeIframe || !authBridgeIframe.contentWindow) {
          throw new Error('Auth bridge iframe not found or not accessible');
        }
        
        // Generate a request ID and create a promise
        const requestId = generateRequestId();
        const requestPromise = new Promise((resolve, reject) => {
          pendingRequests.set(requestId, { resolve, reject });
          
          // Set a timeout for this request
          setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              pendingRequests.delete(requestId);
              reject(new Error('Auth bridge request timeout'));
            }
          }, 3000);
        });
        
        // Make the request
        authBridgeIframe.contentWindow.postMessage({
          type: requestType,
          request_id: requestId,
          ...data
        }, `https://${mainDomain}`);
        
        return requestPromise;
      } catch (e) {
        console.error(`[Storage Helper] Auth bridge request failed (${requestType}):`, e);
        throw e;
      }
    };
    
    // Ping the auth bridge to see if it's ready
    setTimeout(() => {
      // Find any auth bridge iframe
      const authBridgeIframe = document.querySelector('iframe[src*="auth-bridge.html"]');
      
      if (authBridgeIframe && authBridgeIframe.contentWindow) {
        // Try to ping the auth bridge
        authBridgeIframe.contentWindow.postMessage({
          type: 'auth_ping'
        }, `https://${mainDomain}`);
      } else {
        console.warn('[Storage Helper] Auth bridge iframe not found, fallback to local storage');
        clearTimeout(AUTH_BRIDGE_READY.timeout);
        AUTH_BRIDGE_READY.reject(new Error('Auth bridge iframe not found'));
      }
    }, 500); // Give the iframe a little time to load
    
    // Create the cross-domain storage API
    window.crossDomainStorage = {
      getItem: async function(key) {
        try {
          return await makeAuthBridgeRequest('auth_get', { key });
        } catch (e) {
          console.warn('[Storage Helper] Cross-domain getItem failed:', e);
          // Fallback to safe local storage
          return window.safeLocalStorage.getItem(key);
        }
      },
      
      setItem: async function(key, value) {
        try {
          return await makeAuthBridgeRequest('auth_set', { key, value });
        } catch (e) {
          console.warn('[Storage Helper] Cross-domain setItem failed:', e);
          // Fallback to safe local storage
          return window.safeLocalStorage.setItem(key, value);
        }
      },
      
      removeItem: async function(key) {
        try {
          return await makeAuthBridgeRequest('auth_set', { key, value: null });
        } catch (e) {
          console.warn('[Storage Helper] Cross-domain removeItem failed:', e);
          // Fallback to safe local storage
          return window.safeLocalStorage.removeItem(key);
        }
      },
      
      clear: async function() {
        try {
          return await makeAuthBridgeRequest('auth_clear');
        } catch (e) {
          console.warn('[Storage Helper] Cross-domain clear failed:', e);
          // Fallback to safe local storage
          return window.safeLocalStorage.clear();
        }
      }
    };
    
    // Override the Supabase storage with cross-domain versions
    window.supabaseStorage = {
      getSession: async function() {
        return window.crossDomainStorage.getItem('supabase.auth.token');
      },
      setSession: async function(token) {
        return window.crossDomainStorage.setItem('supabase.auth.token', token);
      },
      clearSession: async function() {
        return window.crossDomainStorage.removeItem('supabase.auth.token');
      }
    };
    
    console.log('[Storage Helper] Cross-domain storage setup complete');
  };
  
  // Apply fixes when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCrossDomainStorage);
  } else {
    setupCrossDomainStorage();
  }
})(); 