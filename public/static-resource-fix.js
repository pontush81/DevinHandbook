/**
 * static-resource-fix.js
 * 
 * This script fixes CORS issues with static resources on subdomains by:
 * 1. Intercepting fetch requests for CSS/JS resources
 * 2. Redirecting them through our proxy API
 * 3. Fixing existing <link> and <script> tags
 * 4. Setting up a MutationObserver to handle dynamically added elements
 * 
 * Version: 2.0
 */

(function() {
  // Check if running in browser environment
  if (typeof window === 'undefined') return;

  console.log('[Resource Fix] Static resource fix script loaded');
  
  // Get the current hostname
  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  console.log('[Resource Fix] Current host:', currentHost, 'Protocol:', protocol);
  
  // Determine if we're on a subdomain
  const isSubdomain = currentHost.endsWith('.handbok.org') && 
                      currentHost !== 'handbok.org' && 
                      currentHost !== 'www.handbok.org';
  
  // If we're not on a subdomain, there's no need to run this script
  if (!isSubdomain) {
    console.log('[Resource Fix] Not on a subdomain, no fixes needed');
    return;
  }
  
  // Determine which root domain to use for resource loading
  const rootDomain = 'handbok.org';
  
  // Break redirect loops if detected
  try {
    const redirectCounter = Number(sessionStorage.getItem('resource_redirect_count') || '0');
    if (redirectCounter > 5) {
      console.error('[Resource Fix] Resource redirect loop detected - applying emergency CSS');
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
      notice.className = 'emergency-notice';
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
    console.warn('[Resource Fix] Error with redirect detection:', e);
  }
  
  // Resource loading strategies in order of preference
  const LOADING_STRATEGIES = {
    DIRECT_URL: 'direct',     // Direct URL to the main domain
    PROXY_API: 'proxy',       // Use the proxy API
    INLINE_CONTENT: 'inline'  // Use inline content as fallback
  };
  
  let selectedStrategy = LOADING_STRATEGIES.DIRECT_URL;
  
  // Track loading failures to adjust strategy
  const failedResources = new Set();
  let directUrlFailureCount = 0;
  
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
      console.error('[Resource Fix] Error creating direct URL:', e);
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
      console.error('[Resource Fix] Error creating proxy URL:', e);
      return originalUrl;
    }
  }
  
  // Get the appropriate resource URL based on current strategy
  function getResourceUrl(originalUrl) {
    if (!isSubdomain || !isStaticResource(originalUrl)) {
      return originalUrl;
    }
    
    // Skip if already a full URL to the root domain
    if (originalUrl.includes(`${rootDomain}/`)) {
      return originalUrl;
    }
    
    // Different strategies based on current status
    switch (selectedStrategy) {
      case LOADING_STRATEGIES.DIRECT_URL:
        return createDirectUrl(originalUrl);
      
      case LOADING_STRATEGIES.PROXY_API:
        return createProxyUrl(originalUrl);
      
      default:
        return createDirectUrl(originalUrl);
    }
  }
  
  // Downgrade to next strategy if current one isn't working
  function downgradeStrategyIfNeeded(failedUrl) {
    if (failedUrl) {
      failedResources.add(failedUrl);
    }
    
    if (selectedStrategy === LOADING_STRATEGIES.DIRECT_URL) {
      directUrlFailureCount++;
      
      if (directUrlFailureCount >= 3) {
        console.log('[Resource Fix] Too many direct URL failures, switching to proxy API');
        selectedStrategy = LOADING_STRATEGIES.PROXY_API;
        
        // Apply proxy to all previously failed resources
        fixExistingTags();
      }
    } else if (selectedStrategy === LOADING_STRATEGIES.PROXY_API && failedResources.size > 5) {
      console.log('[Resource Fix] Proxy API failing too often, applying emergency styles');
      selectedStrategy = LOADING_STRATEGIES.INLINE_CONTENT;
      
      // Apply emergency styles
      const style = document.createElement('style');
      style.innerHTML = `
        body {
          font-family: -apple-system, system-ui, sans-serif;
          line-height: 1.5;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        h1, h2, h3 { color: #222; margin-top: 1.5em; margin-bottom: 0.75em; }
        p { margin-bottom: 1em; }
        a { color: #4a56e2; text-decoration: none; }
        a:hover { text-decoration: underline; }
        button, .btn { 
          background: #4a56e2; color: white;
          padding: 0.5rem 1rem; border: none;
          border-radius: 0.25rem; cursor: pointer;
        }
        input, select, textarea {
          border: 1px solid #ddd;
          padding: 0.5rem;
          border-radius: 0.25rem;
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 1rem;
        }
      `;
      document.head.appendChild(style);
      
      // Add emergency notice
      if (document.body && !document.querySelector('.emergency-notice')) {
        const notice = document.createElement('div');
        notice.className = 'emergency-notice';
        notice.innerHTML = '<strong>Nödfallsläge:</strong> Resurser kunde inte laddas korrekt. Sidan visas med begränsad formatering.';
        document.body.insertBefore(notice, document.body.firstChild);
      }
    }
  }
  
  // Override fetch to intercept requests for static resources
  const originalFetch = window.fetch;
  window.fetch = function(resource, init) {
    try {
      if (typeof resource === 'string' && isStaticResource(resource)) {
        const newUrl = getResourceUrl(resource);
        if (newUrl !== resource) {
          console.log('[Resource Fix] Redirecting fetch:', resource, '→', newUrl);
          
          // Create a new promise to handle the fetch with our interceptor
          return new Promise((resolve, reject) => {
            originalFetch(newUrl, init)
              .then(response => {
                if (!response.ok) {
                  console.warn(`[Resource Fix] Failed to fetch ${newUrl} (status: ${response.status})`);
                  downgradeStrategyIfNeeded(resource);
                  
                  // Try with original URL as fallback
                  return originalFetch(resource, init);
                }
                return response;
              })
              .then(resolve)
              .catch(error => {
                console.error('[Resource Fix] Fetch error:', error);
                downgradeStrategyIfNeeded(resource);
                
                // Try with original URL as fallback
                originalFetch(resource, init).then(resolve).catch(reject);
              });
          });
        }
      }
    } catch (e) {
      console.error('[Resource Fix] Error in fetch override:', e);
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
            console.log('[Resource Fix] Fixing CSS link:', href, '→', newUrl);
            
            // Create a new link element to avoid 'changing' the href which can cause issues
            const newLink = document.createElement('link');
            Array.from(link.attributes).forEach(attr => {
              if (attr.name === 'href') {
                newLink.setAttribute('href', newUrl);
              } else {
                newLink.setAttribute(attr.name, attr.value);
              }
            });
            
            // Add error handling
            newLink.addEventListener('error', function(e) {
              console.warn('[Resource Fix] Failed to load CSS:', newUrl);
              downgradeStrategyIfNeeded(href);
              
              // If the strategy changed, we'll fix tags again
              if (selectedStrategy !== LOADING_STRATEGIES.DIRECT_URL) {
                setTimeout(fixExistingTags, 100);
              }
            });
            
            // Replace the old link with the new one
            if (link.parentNode) {
              link.parentNode.insertBefore(newLink, link);
              link.parentNode.removeChild(link);
            }
          }
        }
      });
      
      // Fix JS scripts
      document.querySelectorAll('script[src]').forEach(script => {
        const src = script.getAttribute('src');
        if (src && isStaticResource(src)) {
          const newUrl = getResourceUrl(src);
          if (newUrl !== src) {
            console.log('[Resource Fix] Fixing script src:', src, '→', newUrl);
            
            // Create a new script to replace the old one
            const newScript = document.createElement('script');
            Array.from(script.attributes).forEach(attr => {
              if (attr.name === 'src') {
                newScript.setAttribute('src', newUrl);
              } else {
                newScript.setAttribute(attr.name, attr.value);
              }
            });
            
            // Add error handling
            newScript.addEventListener('error', function(e) {
              console.warn('[Resource Fix] Failed to load script:', newUrl);
              downgradeStrategyIfNeeded(src);
            });
            
            // Replace the old script with the new one
            if (script.parentNode) {
              script.parentNode.insertBefore(newScript, script);
              script.parentNode.removeChild(script);
            }
          }
        }
      });
      
      // Fix font and other preloads
      document.querySelectorAll('link[rel="preload"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && isStaticResource(href)) {
          const newUrl = getResourceUrl(href);
          if (newUrl !== href) {
            console.log('[Resource Fix] Fixing preload link:', href, '→', newUrl);
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
            console.log('[Resource Fix] Fixing icon link:', href, '→', newUrl);
            link.setAttribute('href', newUrl);
          }
        }
      });
      
      // Fix images with static resource paths
      document.querySelectorAll('img[src]').forEach(img => {
        const src = img.getAttribute('src');
        if (src && isStaticResource(src)) {
          const newUrl = getResourceUrl(src);
          if (newUrl !== src) {
            console.log('[Resource Fix] Fixing image src:', src, '→', newUrl);
            img.setAttribute('src', newUrl);
          }
        }
      });
    } catch (e) {
      console.error('[Resource Fix] Error fixing existing tags:', e);
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
                  console.log('[Resource Fix] Fixing dynamically added link:', href, '→', newUrl);
                  node.setAttribute('href', newUrl);
                  
                  // Add error listener
                  node.addEventListener('error', () => {
                    console.warn('[Resource Fix] Dynamic link loading failed:', newUrl);
                    downgradeStrategyIfNeeded(href);
                  });
                }
              }
            }
            
            // Handle new script elements
            if (node.tagName === 'SCRIPT') {
              const src = node.getAttribute('src');
              if (src && isStaticResource(src)) {
                const newUrl = getResourceUrl(src);
                if (newUrl !== src) {
                  console.log('[Resource Fix] Fixing dynamically added script:', src, '→', newUrl);
                  node.setAttribute('src', newUrl);
                  
                  // Add error listener
                  node.addEventListener('error', () => {
                    console.warn('[Resource Fix] Dynamic script loading failed:', newUrl);
                    downgradeStrategyIfNeeded(src);
                  });
                }
              }
            }
            
            // Handle new images
            if (node.tagName === 'IMG') {
              const src = node.getAttribute('src');
              if (src && isStaticResource(src)) {
                const newUrl = getResourceUrl(src);
                if (newUrl !== src) {
                  console.log('[Resource Fix] Fixing dynamically added image:', src, '→', newUrl);
                  node.setAttribute('src', newUrl);
                }
              }
            }
            
            // Process all children recursively
            if (node.querySelectorAll) {
              // Fix links in this subtree
              node.querySelectorAll('link[href], script[src], img[src]').forEach(el => {
                const attr = el.tagName === 'LINK' ? 'href' : 'src';
                const originalUrl = el.getAttribute(attr);
                
                if (originalUrl && isStaticResource(originalUrl)) {
                  const newUrl = getResourceUrl(originalUrl);
                  if (newUrl !== originalUrl) {
                    console.log(`[Resource Fix] Fixing ${el.tagName.toLowerCase()} in new subtree:`, originalUrl, '→', newUrl);
                    el.setAttribute(attr, newUrl);
                  }
                }
              });
            }
          }
        }
      });
      
      // Start observing
      observer.observe(document, { childList: true, subtree: true });
      
      // Store observer in window so it's not garbage collected
      window._resourceFixObserver = observer;
      
      console.log('[Resource Fix] MutationObserver setup complete');
    } catch (e) {
      console.error('[Resource Fix] Error setting up MutationObserver:', e);
    }
  }
  
  // Monitor resource errors
  function setupErrorMonitoring() {
    window.addEventListener('error', function(e) {
      const target = e.target;
      
      // Only handle loading errors for resources
      if (!target || !target.tagName) return;
      
      // Check if this is a resource loading error
      if ((target.tagName === 'LINK' || target.tagName === 'SCRIPT' || target.tagName === 'IMG') && 
          (e.type === 'error' || e.type === 'load')) {
        
        const url = target.src || target.href;
        if (!url || !isStaticResource(url)) return;
        
        console.warn('[Resource Fix] Resource loading error:', url);
        downgradeStrategyIfNeeded(url);
        
        // Try to fix this specific element
        const attr = target.tagName === 'LINK' ? 'href' : 'src';
        const newUrl = getResourceUrl(url);
        
        // Only change if we're using a different strategy now
        if (url !== newUrl) {
          console.log('[Resource Fix] Attempting to fix failed resource:', url, '→', newUrl);
          target.setAttribute(attr, newUrl);
        }
      }
    }, true);
  }
  
  // Apply font and CSS fixes for common issues
  function applyFontFixes() {
    // Add emergency font-face declarations
    const style = document.createElement('style');
    style.innerHTML = `
      /* Fallback font definitions */
      @font-face {
        font-family: 'Geist';
        src: local('Arial');
        font-display: swap;
      }
      
      @font-face {
        font-family: 'Geist Mono';
        src: local('Courier New');
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
    
    // Add font loading detection
    document.fonts.ready.then(function() {
      if (document.fonts.check('1em Geist') === false) {
        console.warn('[Resource Fix] Font loading failed, applying fallbacks');
        const fallbackStyle = document.createElement('style');
        fallbackStyle.innerHTML = `
          /* Font fallbacks for missing Geist */
          .font-sans, [class*="font-geist-sans"], [style*="font-family: Geist"] {
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
          }
          
          .font-mono, [class*="font-geist-mono"], [style*="font-family: Geist Mono"] {
            font-family: "Courier New", monospace !important;
          }
        `;
        document.head.appendChild(fallbackStyle);
      }
    });
  }
  
  // Initialize everything
  function init() {
    console.log('[Resource Fix] Initializing fixes for subdomain:', currentHost);
    
    // Apply font fixes
    applyFontFixes();
    
    // Setup error monitoring
    setupErrorMonitoring();
    
    // Fix all existing tags
    fixExistingTags();
    
    // Set up observer for future changes
    setupMutationObserver();
    
    console.log('[Resource Fix] All fixes applied');
  }
  
  // Run initialization immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 