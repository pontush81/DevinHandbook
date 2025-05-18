/**
 * static-resource-fix.js
 * 
 * This script fixes CORS issues with static resources on subdomains by:
 * 1. Intercepting fetch requests for CSS/JS resources
 * 2. Redirecting them through our proxy API
 * 3. Fixing existing <link> and <script> tags
 * 4. Setting up a MutationObserver to handle dynamically added elements
 */

(function() {
  // Check if running in browser environment
  if (typeof window === 'undefined') return;

  console.log('Static resource fix script loaded');
  
  // Get the current hostname
  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  console.log('Current host:', currentHost, 'Protocol:', protocol);
  
  // Determine if we're on a subdomain
  const isSubdomain = currentHost.endsWith('.handbok.org') && 
                      currentHost !== 'handbok.org' && 
                      currentHost !== 'www.handbok.org';
  
  // Determine which root domain to use for resource loading
  const rootDomain = 'handbok.org';
  
  // Break redirect loops if detected
  try {
    const redirectCounter = Number(sessionStorage.getItem('resource_redirect_count') || '0');
    if (redirectCounter > 5) {
      console.error('Resource redirect loop detected - applying emergency CSS');
      // Apply basic emergency CSS to make page usable
      const style = document.createElement('style');
      style.innerHTML = `
        body {
          font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          line-height: 1.5;
          padding: 1rem;
          max-width: 1000px;
          margin: 0 auto;
          color: #333;
        }
        button, .btn, [type="button"], [type="submit"] {
          background: #4a56e2;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        input, select, textarea {
          border: 1px solid #ddd;
          padding: 0.5rem;
          border-radius: 0.25rem;
          width: 100%;
          box-sizing: border-box;
        }
        a { color: #4a56e2; }
        h1, h2, h3 { color: #222; }
      `;
      document.head.appendChild(style);
      
      // Reset counter
      sessionStorage.setItem('resource_redirect_count', '0');
      
      // Add message to page
      const notice = document.createElement('div');
      notice.style.padding = '8px 12px';
      notice.style.background = '#fbedd0';
      notice.style.color = '#9a5f02';
      notice.style.borderRadius = '4px';
      notice.style.margin = '10px 0';
      notice.style.fontSize = '14px';
      notice.innerHTML = '<strong>Nödfallsläge:</strong> Sidan visas med begränsad formatering på grund av problem med resursinladdning.';
      
      // Insert at top of body when it's available
      if (document.body) {
        document.body.insertBefore(notice, document.body.firstChild);
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          document.body.insertBefore(notice, document.body.firstChild);
        });
      }
      
      return; // Stop further execution to prevent more redirects
    }
    
    // Increment counter when accessing resources
    sessionStorage.setItem('resource_redirect_count', (redirectCounter + 1).toString());
    
    // Reset after 10 seconds if no issues
    setTimeout(function() {
      sessionStorage.setItem('resource_redirect_count', '0');
    }, 10000);
  } catch (e) {
    console.warn('Error with redirect detection:', e);
  }
  
  // Helper function to check if a URL is a static resource
  function isStaticResource(url) {
    if (typeof url !== 'string') return false;
    
    return url.includes('/_next/static/') || 
           url.includes('.css') || 
           url.includes('.js') ||
           url.includes('/static/') ||
           url.includes('/fonts/') ||
           url.includes('/assets/') ||
           url.includes('.woff') ||
           url.includes('.woff2');
  }
  
  // Helper to create direct URL to the root domain
  function createDirectUrl(originalUrl) {
    try {
      // Handle both absolute and relative URLs
      let resourcePath;
      if (originalUrl.startsWith('http')) {
        resourcePath = new URL(originalUrl).pathname;
      } else {
        resourcePath = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
      }
      
      return `${protocol}//${rootDomain}${resourcePath}`;
    } catch (e) {
      console.error('Error creating direct URL:', e);
      return originalUrl;
    }
  }
  
  // Helper to create proxy URL
  function createProxyUrl(originalUrl) {
    try {
      // Handle both absolute and relative URLs
      let resourcePath;
      if (originalUrl.startsWith('http')) {
        resourcePath = new URL(originalUrl).pathname;
      } else {
        resourcePath = originalUrl;
      }
      return `/api/resources?path=${encodeURIComponent(resourcePath)}`;
    } catch (e) {
      console.error('Error creating proxy URL:', e);
      return originalUrl;
    }
  }
  
  // Use direct URL approach instead of proxy for subdomains
  function getResourceUrl(originalUrl) {
    if (isSubdomain) {
      return createDirectUrl(originalUrl);
    }
    return originalUrl;
  }
  
  // Override fetch to intercept requests for static resources
  const originalFetch = window.fetch;
  window.fetch = function(resource, init) {
    try {
      if (typeof resource === 'string' && isStaticResource(resource)) {
        const newUrl = getResourceUrl(resource);
        if (newUrl !== resource) {
          console.log('Redirecting fetch:', resource, '→', newUrl);
          return originalFetch(newUrl, init);
        }
      }
    } catch (e) {
      console.error('Error in fetch override:', e);
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  // Fix existing <link> and <script> tags
  function fixExistingTags() {
    try {
      // Fix CSS links
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && isStaticResource(href)) {
          const newUrl = getResourceUrl(href);
          if (newUrl !== href) {
            console.log('Fixing CSS link:', href, '→', newUrl);
            link.setAttribute('href', newUrl);
          }
        }
      });
      
      // Fix JS scripts
      document.querySelectorAll('script[src]').forEach(script => {
        const src = script.getAttribute('src');
        if (src && isStaticResource(src)) {
          const newUrl = getResourceUrl(src);
          if (newUrl !== src) {
            console.log('Fixing script src:', src, '→', newUrl);
            script.setAttribute('src', newUrl);
          }
        }
      });
      
      // Fix font and other preloads
      document.querySelectorAll('link[rel="preload"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && isStaticResource(href)) {
          const newUrl = getResourceUrl(href);
          if (newUrl !== href) {
            console.log('Fixing preload link:', href, '→', newUrl);
            link.setAttribute('href', newUrl);
          }
        }
      });
      
      // Fix favicon and other icon links
      document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          const newUrl = getResourceUrl(href);
          if (newUrl !== href) {
            console.log('Fixing icon link:', href, '→', newUrl);
            link.setAttribute('href', newUrl);
          }
        }
      });
    } catch (e) {
      console.error('Error fixing existing tags:', e);
    }
  }
  
  // Set up MutationObserver to fix dynamically added elements
  function setupMutationObserver() {
    try {
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            // Skip non-element nodes
            if (!node.tagName) continue;
            
            // Handle new link elements (CSS, fonts)
            if (node.tagName === 'LINK') {
              const href = node.getAttribute('href');
              if (href && isStaticResource(href)) {
                const newUrl = getResourceUrl(href);
                if (newUrl !== href) {
                  console.log('Fixing dynamically added link:', href, '→', newUrl);
                  node.setAttribute('href', newUrl);
                }
              }
            } 
            // Handle script elements
            else if (node.tagName === 'SCRIPT') {
              const src = node.getAttribute('src');
              if (src && isStaticResource(src)) {
                const newUrl = getResourceUrl(src);
                if (newUrl !== src) {
                  console.log('Fixing dynamically added script:', src, '→', newUrl);
                  node.setAttribute('src', newUrl);
                }
              }
            }
            
            // Check for nested elements
            if (node.querySelectorAll) {
              // Fix links inside the new node
              node.querySelectorAll('link[href], script[src]').forEach(elem => {
                const attrName = elem.hasAttribute('href') ? 'href' : 'src';
                const attrValue = elem.getAttribute(attrName);
                
                if (attrValue && isStaticResource(attrValue)) {
                  const newUrl = getResourceUrl(attrValue);
                  if (newUrl !== attrValue) {
                    console.log(`Fixing nested ${elem.tagName}:`, attrValue, '→', newUrl);
                    elem.setAttribute(attrName, newUrl);
                  }
                }
              });
            }
          }
        }
      });
      
      observer.observe(document, { 
        childList: true, 
        subtree: true 
      });
      
      return observer;
    } catch (e) {
      console.error('Error setting up MutationObserver:', e);
      return null;
    }
  }
  
  // Fix for "Access to storage is not allowed from this context" error
  try {
    // Create a separate storage object that works across subdomains
    const safeStorage = {
      getItem: function(key) {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.warn('LocalStorage access failed:', e.message);
          return null;
        }
      },
      setItem: function(key, value) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (e) {
          console.warn('LocalStorage write failed:', e.message);
          return false;
        }
      },
      removeItem: function(key) {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (e) {
          console.warn('LocalStorage removal failed:', e.message);
          return false;
        }
      },
      clear: function() {
        try {
          localStorage.clear();
          return true;
        } catch (e) {
          console.warn('LocalStorage clear failed:', e.message);
          return false;
        }
      }
    };

    // Expose the safe storage methods globally
    window.safeStorage = safeStorage;
  } catch (e) {
    console.error('Error setting up safe storage:', e);
  }
  
  // Main initialization function
  function init() {
    console.log('Initializing static resource fix');
    
    // Fix existing tags first
    fixExistingTags();
    
    // Set up observer for future changes
    const observer = setupMutationObserver();
    
    // Log successful initialization
    console.log('Static resource fix initialized successfully');
    
    // Apply fixes a second time after a delay to catch late-loaded resources
    setTimeout(fixExistingTags, 500);
    setTimeout(fixExistingTags, 2000);
    
    // Reset resource redirect counter as initialization succeeded
    try {
      sessionStorage.setItem('resource_redirect_count', '0');
    } catch (e) {
      console.warn('Could not reset resource redirect counter:', e);
    }
    
    return {
      observer,
      isSubdomain,
      host: currentHost,
      fixTags: fixExistingTags
    };
  }
  
  // Ensure we initialize as soon as possible
  let result;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      result = init();
      window.resourceFixInfo = result;
    });
  } else {
    result = init();
    window.resourceFixInfo = result;
  }
})(); 