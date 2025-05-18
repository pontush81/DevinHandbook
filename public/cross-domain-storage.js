/**
 * Cross-Domain Storage Helper
 * 
 * Provides secure localStorage access across subdomains through a bridge iframe.
 * Uses postMessage API for secure communication.
 */
(function() {
  const CrossDomainStorage = function(bridgeUrl) {
    this.bridgeUrl = bridgeUrl || 'https://handbok.org/storage-bridge.html';
    this.iframe = null;
    this.ready = false;
    this.queue = [];
    this.requests = {};
    this.messageId = 0;
    
    this.init();
  };
  
  CrossDomainStorage.prototype = {
    init: function() {
      // Create hidden iframe
      this.iframe = document.createElement('iframe');
      this.iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
      this.iframe.src = this.bridgeUrl;
      
      // Set up message listener
      window.addEventListener('message', this._handleMessage.bind(this), false);
      
      // Append iframe to document
      document.body ? document.body.appendChild(this.iframe) : 
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(this.iframe);
        });
    },
    
    _handleMessage: function(event) {
      // Check origin for security
      if (event.origin !== new URL(this.bridgeUrl).origin) {
        return;
      }
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Handle ready message
        if (data.ready) {
          this.ready = true;
          this._processQueue();
          return;
        }
        
        // Handle response from bridge
        const request = this.requests[data.id];
        if (request) {
          if (data.error) {
            request.reject(new Error(data.error));
          } else {
            request.resolve(data.result);
          }
          delete this.requests[data.id];
        }
      } catch (e) {
        console.error('Error handling storage message:', e);
      }
    },
    
    _processQueue: function() {
      while (this.queue.length) {
        const task = this.queue.shift();
        this._sendRequest(task.action, task.key, task.value, task.resolve, task.reject);
      }
    },
    
    _sendRequest: function(action, key, value, resolve, reject) {
      const id = this.messageId++;
      
      this.requests[id] = { resolve, reject };
      
      const message = JSON.stringify({
        id: id,
        action: action,
        key: key,
        value: value
      });
      
      try {
        this.iframe.contentWindow.postMessage(message, new URL(this.bridgeUrl).origin);
      } catch (e) {
        delete this.requests[id];
        reject(e);
      }
    },
    
    // Public API methods
    getItem: function(key) {
      return new Promise((resolve, reject) => {
        if (this.ready) {
          this._sendRequest('getItem', key, null, resolve, reject);
        } else {
          this.queue.push({ action: 'getItem', key, value: null, resolve, reject });
        }
      });
    },
    
    setItem: function(key, value) {
      return new Promise((resolve, reject) => {
        if (this.ready) {
          this._sendRequest('setItem', key, value, resolve, reject);
        } else {
          this.queue.push({ action: 'setItem', key, value, resolve, reject });
        }
      });
    },
    
    removeItem: function(key) {
      return new Promise((resolve, reject) => {
        if (this.ready) {
          this._sendRequest('removeItem', key, null, resolve, reject);
        } else {
          this.queue.push({ action: 'removeItem', key, value: null, resolve, reject });
        }
      });
    },
    
    clear: function() {
      return new Promise((resolve, reject) => {
        if (this.ready) {
          this._sendRequest('clear', null, null, resolve, reject);
        } else {
          this.queue.push({ action: 'clear', key: null, value: null, resolve, reject });
        }
      });
    }
  };
  
  // Create fallback storage with memory if localStorage is not available
  const createSafeLocalStorage = function() {
    let memoryStorage = {};
    let hasLocalStorage = false;
    
    try {
      // Test if localStorage is available
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      hasLocalStorage = true;
    } catch (e) {
      console.warn('LocalStorage is not available, using memory storage');
    }
    
    return {
      getItem: function(key) {
        try {
          return hasLocalStorage ? localStorage.getItem(key) : memoryStorage[key] || null;
        } catch (e) {
          return memoryStorage[key] || null;
        }
      },
      setItem: function(key, value) {
        try {
          if (hasLocalStorage) localStorage.setItem(key, value);
          memoryStorage[key] = value;
        } catch (e) {
          memoryStorage[key] = value;
        }
      },
      removeItem: function(key) {
        try {
          if (hasLocalStorage) localStorage.removeItem(key);
          delete memoryStorage[key];
        } catch (e) {
          delete memoryStorage[key];
        }
      },
      clear: function() {
        try {
          if (hasLocalStorage) localStorage.clear();
          memoryStorage = {};
        } catch (e) {
          memoryStorage = {};
        }
      }
    };
  };
  
  // Detect if we're on a subdomain
  const isSubdomain = window.location.hostname.split('.').length > 2 && 
                     window.location.hostname.indexOf('handbok.org') > -1;
  
  // Create and expose the appropriate storage method
  if (isSubdomain) {
    // We're on a subdomain, use cross-domain storage via bridge
    window.safeStorage = new CrossDomainStorage('https://handbok.org/storage-bridge.html');
  } else {
    // Direct storage access with fallback
    window.safeStorage = createSafeLocalStorage();
  }
})(); 