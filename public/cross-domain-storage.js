/**
 * Cross-Domain Storage Helper
 * 
 * This script helps solve the "Access to storage is not allowed from this context" error
 * when accessing localStorage/sessionStorage across different subdomains.
 */

(function() {
  // Check if running in browser environment
  if (typeof window === 'undefined') return;

  console.log('Cross-domain storage helper loaded');
  
  // Create a wrapper for storage operations that handles exceptions
  const createSafeStorage = (storageType) => {
    const storage = window[storageType];
    
    return {
      getItem: function(key) {
        try {
          return storage.getItem(key);
        } catch (e) {
          console.warn(`${storageType} access failed:`, e.message);
          return null;
        }
      },
      setItem: function(key, value) {
        try {
          storage.setItem(key, value);
          return true;
        } catch (e) {
          console.warn(`${storageType} write failed:`, e.message);
          return false;
        }
      },
      removeItem: function(key) {
        try {
          storage.removeItem(key);
          return true;
        } catch (e) {
          console.warn(`${storageType} removal failed:`, e.message);
          return false;
        }
      },
      clear: function() {
        try {
          storage.clear();
          return true;
        } catch (e) {
          console.warn(`${storageType} clear failed:`, e.message);
          return false;
        }
      },
      key: function(index) {
        try {
          return storage.key(index);
        } catch (e) {
          console.warn(`${storageType} key access failed:`, e.message);
          return null;
        }
      },
      length: function() {
        try {
          return storage.length;
        } catch (e) {
          console.warn(`${storageType} length access failed:`, e.message);
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
  
  // Handle the iframe-based storage approach for cross-domain
  const setupCrossDomainStorage = () => {
    const mainDomain = 'handbok.org';
    const currentDomain = window.location.hostname;
    
    // Only set up if we're on a subdomain
    if (currentDomain === mainDomain || currentDomain === 'www.handbok.org') {
      return;
    }
    
    // Create hidden iframe pointing to storage helper on main domain
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `https://${mainDomain}/storage-bridge.html`;
    
    // Add messaging functionality once iframe is loaded
    iframe.onload = function() {
      // Create messaging functions
      window.crossDomainStorage = {
        getItem: function(key, callback) {
          const messageId = Date.now().toString();
          const message = {
            id: messageId,
            action: 'get',
            key: key
          };
          
          // Set up listener for response
          const listener = function(event) {
            if (event.origin !== `https://${mainDomain}`) return;
            
            try {
              const data = event.data;
              if (data.id !== messageId) return;
              
              window.removeEventListener('message', listener);
              callback(data.error, data.value);
            } catch (e) {
              console.error('Error processing storage response:', e);
              callback(e, null);
            }
          };
          
          window.addEventListener('message', listener);
          iframe.contentWindow.postMessage(message, `https://${mainDomain}`);
        },
        
        setItem: function(key, value, callback) {
          const messageId = Date.now().toString();
          const message = {
            id: messageId,
            action: 'set',
            key: key,
            value: value
          };
          
          // Set up listener for response
          const listener = function(event) {
            if (event.origin !== `https://${mainDomain}`) return;
            
            try {
              const data = event.data;
              if (data.id !== messageId) return;
              
              window.removeEventListener('message', listener);
              callback && callback(data.error);
            } catch (e) {
              console.error('Error processing storage response:', e);
              callback && callback(e);
            }
          };
          
          window.addEventListener('message', listener);
          iframe.contentWindow.postMessage(message, `https://${mainDomain}`);
        },
        
        removeItem: function(key, callback) {
          const messageId = Date.now().toString();
          const message = {
            id: messageId,
            action: 'remove',
            key: key
          };
          
          // Set up listener for response
          const listener = function(event) {
            if (event.origin !== `https://${mainDomain}`) return;
            
            try {
              const data = event.data;
              if (data.id !== messageId) return;
              
              window.removeEventListener('message', listener);
              callback && callback(data.error);
            } catch (e) {
              console.error('Error processing storage response:', e);
              callback && callback(e);
            }
          };
          
          window.addEventListener('message', listener);
          iframe.contentWindow.postMessage(message, `https://${mainDomain}`);
        }
      };
    };
    
    // Add iframe to the document
    document.body.appendChild(iframe);
  };
  
  // Apply fixes when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCrossDomainStorage);
  } else {
    setupCrossDomainStorage();
  }
})(); 