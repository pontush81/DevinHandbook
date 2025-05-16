// This script ensures static resources load correctly from the main domain
// It's loaded in <head> to run before any other resources are requested

(function() {
  try {
    const MAIN_DOMAIN = 'handbok.org';
    const MAIN_URL = 'https://' + MAIN_DOMAIN;
    const CURRENT_DOMAIN = window.location.hostname;
    const USE_PROXY = true; // Använd proxy för att hämta resurser (bättre för CORS)
    
    // Function to check if the current host is a subdomain
    function isSubdomain() {
      const host = window.location.hostname;
      return host !== MAIN_DOMAIN && 
             host !== 'www.' + MAIN_DOMAIN && 
             host.endsWith('.' + MAIN_DOMAIN);
    }
    
    // Only apply fixes on subdomains and www
    if (!isSubdomain() && window.location.hostname !== 'www.' + MAIN_DOMAIN) return;
    
    // Log message for debugging
    console.log('[StaticResourceFix] Running on:', window.location.hostname);
    
    // Transform a resource path to use the proxy
    function getProxyUrl(path) {
      if (path.startsWith('/')) {
        // For local paths, use our proxy endpoint
        const currentOrigin = window.location.origin;
        return `${currentOrigin}/api/resources?path=${encodeURIComponent(path)}`;
      }
      return path; // External resources stay as-is
    }
    
    // Transform a resource path to use the main domain directly
    function getDirectUrl(path) {
      if (path.startsWith('/')) {
        return MAIN_URL + path;
      }
      return path;
    }
    
    // Get the right URL based on our strategy
    function getResourceUrl(path) {
      return USE_PROXY ? getProxyUrl(path) : getDirectUrl(path);
    }
    
    // Funktioner för inlining av kritiska resurser när CORS misslyckas
    const criticalResources = {
      fontData: {
        'geist': null,
        'geist-mono': null
      },
      cssData: {
        'main': null
      }
    };
    
    // Fetch och cache kritiska resurser som kan fallback vid CORS-fel
    function prefetchCriticalResources() {
      // Använd blob för att hantera fonter när CORS misslyckas
      if (window.fetch) {
        // Försök hämta fontdata med proxy
        const geistFontUrl = getResourceUrl('/_next/static/media/569ce4b8f30dc480-s.p.woff2');
        fetch(geistFontUrl)
          .then(res => res.blob())
          .then(blob => {
            criticalResources.fontData['geist'] = URL.createObjectURL(blob);
            console.log('[StaticResourceFix] Font cached: geist');
            createFontFaceRules();
          })
          .catch(e => console.error('[StaticResourceFix] Font fetch failed:', e));
        
        const geistMonoUrl = getResourceUrl('/_next/static/media/a34f9d1faa5f3315-s.p.woff2');
        fetch(geistMonoUrl)
          .then(res => res.blob())
          .then(blob => {
            criticalResources.fontData['geist-mono'] = URL.createObjectURL(blob);
            console.log('[StaticResourceFix] Font cached: geist-mono');
            createFontFaceRules();
          })
          .catch(e => console.error('[StaticResourceFix] Font fetch failed:', e));
      }
    }
    
    // Skapa font-face regler baserat på cachade fontfiler
    function createFontFaceRules() {
      if (!criticalResources.fontData['geist'] && !criticalResources.fontData['geist-mono']) return;
      
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-resource-fix', 'true');
      
      let cssText = '';
      
      if (criticalResources.fontData['geist']) {
        cssText += `
          @font-face {
            font-family: 'Geist';
            font-style: normal;
            font-weight: 100 900;
            font-display: swap;
            src: url('${criticalResources.fontData['geist']}') format('woff2');
          }
        `;
      }
      
      if (criticalResources.fontData['geist-mono']) {
        cssText += `
          @font-face {
            font-family: 'Geist Mono';
            font-style: normal;
            font-weight: 100 900;
            font-display: swap;
            src: url('${criticalResources.fontData['geist-mono']}') format('woff2');
          }
        `;
      }
      
      styleEl.textContent = cssText;
      document.head.appendChild(styleEl);
    }
    
    // Starta prefetch av kritiska resurser
    prefetchCriticalResources();
    
    // Override fetch to redirect static resources
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string') {
        // Check if this is a static resource
        if (url.includes('/_next/') || 
            url.endsWith('.js') || 
            url.endsWith('.css') || 
            url.endsWith('.woff') || 
            url.endsWith('.woff2') ||
            url.includes('/static/')) {
          
          // Rewrite relative URLs to use our proxy
          if (url.startsWith('/')) {
            const newUrl = getResourceUrl(url);
            console.log('[StaticResourceFix] Redirecting fetch:', url, '→', newUrl);
            url = newUrl;
            
            // Add cors mode to options if not specified
            if (options) {
              // Allow credentials to flow through
              options.mode = 'cors';
            } else {
              options = {
                mode: 'cors' 
              };
            }
          }
        }
      }
      return originalFetch.apply(this, [url, options]);
    };
    
    // Override XMLHttpRequest open method to redirect static resources
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      if (typeof url === 'string') {
        // Check if this is a static resource
        if (url.includes('/_next/') || 
            url.endsWith('.js') || 
            url.endsWith('.css') || 
            url.endsWith('.woff') || 
            url.endsWith('.woff2') ||
            url.includes('/static/')) {
          
          // Rewrite relative URLs to use our proxy
          if (url.startsWith('/')) {
            const newUrl = getResourceUrl(url);
            console.log('[StaticResourceFix] Redirecting XHR:', url, '→', newUrl);
            url = newUrl;
          }
        }
      }
      return originalOpen.call(this, method, url, async, user, password);
    };
    
    // Hjälpfunktion för inline-laddning av resurser
    function loadInlineResource(url, type) {
      // Alltid använd proxy för inline-resources
      const resourceUrl = getResourceUrl(url);
      
      return fetch(resourceUrl, {mode: 'cors'})
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load ${resourceUrl}: ${response.status}`);
          }
          
          if (type === 'script') {
            return response.text().then(text => {
              const script = document.createElement('script');
              script.textContent = text;
              document.head.appendChild(script);
              console.log('[StaticResourceFix] Inlined script:', url);
            });
          } else if (type === 'style') {
            return response.text().then(text => {
              const style = document.createElement('style');
              style.textContent = text;
              document.head.appendChild(style);
              console.log('[StaticResourceFix] Inlined style:', url);
            });
          }
        })
        .catch(error => {
          console.error('[StaticResourceFix] Failed to inline resource:', url, error);
        });
    }
    
    // Funktion för att fixa alla script/style element på sidan
    function fixResourceElements() {
      document.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="preload"]').forEach(function(el) {
        const src = el.getAttribute('src') || el.getAttribute('href');
        if (src && src.startsWith('/') && 
            (src.includes('/_next/') || 
             src.endsWith('.js') || 
             src.endsWith('.css') || 
             src.endsWith('.woff') || 
             src.endsWith('.woff2'))) {
          
          const newSrc = getResourceUrl(src);
          console.log('[StaticResourceFix] Fixing resource:', src, '→', newSrc);
          
          if (el.tagName.toLowerCase() === 'script') {
            el.setAttribute('src', newSrc);
            
            // Fallback om skriptet misslyckas ladda p.g.a. CORS
            el.addEventListener('error', function() {
              console.log('[StaticResourceFix] Script load failed, trying inline:', newSrc);
              loadInlineResource(src, 'script');
            });
          } else if (el.getAttribute('rel') === 'stylesheet') {
            el.setAttribute('href', newSrc);
            
            // Fallback om CSS misslyckas ladda p.g.a. CORS
            el.addEventListener('error', function() {
              console.log('[StaticResourceFix] Stylesheet load failed, trying inline:', newSrc);
              loadInlineResource(src, 'style');
            });
          } else {
            el.setAttribute('href', newSrc);
            // För preload, lägg till crossorigin-attribut
            el.setAttribute('crossorigin', 'anonymous');
          }
        }
      });
    }
    
    // Listen for DOM content loaded to fix existing resources
    document.addEventListener('DOMContentLoaded', fixResourceElements);
    
    // Fixa även befintliga resurser direkt, om DOM är redan laddad
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      fixResourceElements();
    }
    
    // MutationObserver to catch dynamically added resources
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') {
                const src = node.getAttribute('src') || node.getAttribute('href');
                if (src && src.startsWith('/') && 
                    (src.includes('/_next/') || 
                     src.endsWith('.js') || 
                     src.endsWith('.css') || 
                     src.endsWith('.woff') || 
                     src.endsWith('.woff2'))) {
                  
                  const newSrc = getResourceUrl(src);
                  console.log('[StaticResourceFix] Fixing dynamically added resource:', src, '→', newSrc);
                  
                  if (node.tagName === 'SCRIPT') {
                    node.setAttribute('src', newSrc);
                    
                    // Fallback om skriptet misslyckas ladda p.g.a. CORS
                    node.addEventListener('error', function() {
                      console.log('[StaticResourceFix] Dynamic script load failed, trying inline:', newSrc);
                      loadInlineResource(src, 'script');
                    });
                  } else {
                    node.setAttribute('href', newSrc);
                    
                    // För preload/stylesheet, lägg till crossorigin
                    node.setAttribute('crossorigin', 'anonymous');
                    
                    // Fallback för stylesheets
                    if (node.getAttribute('rel') === 'stylesheet') {
                      node.addEventListener('error', function() {
                        console.log('[StaticResourceFix] Dynamic stylesheet load failed, trying inline:', newSrc);
                        loadInlineResource(src, 'style');
                      });
                    }
                  }
                }
              }
            }
          });
        }
      });
    });
    
    // Start observing document for added scripts/styles
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
    console.log('[StaticResourceFix] Setup complete - using proxy mode');
  } catch (e) {
    console.error('[StaticResourceFix] Error:', e);
  }
})(); 