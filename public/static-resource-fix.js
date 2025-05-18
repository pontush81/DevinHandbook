/**
 * static-resource-fix.js
 * 
 * This script fixes CORS issues with static resources on subdomains by:
 * 1. Intercepting fetch requests for CSS/JS resources
 * 2. Redirecting them through our proxy API
 * 3. Fixing existing <link> and <script> tags
 * 4. Setting up a MutationObserver to handle dynamically added elements
 * 
 * Version: 3.0
 */

(function() {
  // Check if running in browser environment
  if (typeof window === 'undefined') return;

  console.log('[Resource Fix] Static resource fix script loaded v3.0');
  
  // Debug flag - set to true for verbose logging
  const DEBUG = false;
  
  function debug(...args) {
    if (DEBUG) console.log('[Resource Fix]', ...args);
  }
  
  // Get the current hostname and protocol
  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  debug('Current host:', currentHost, 'Protocol:', protocol);
  
  // Determine if we're on a subdomain
  const isSubdomain = currentHost.endsWith('.handbok.org') && 
                      currentHost !== 'handbok.org' && 
                      currentHost !== 'www.handbok.org';
  
  // If we're not on a subdomain, there's no need to run this script
  if (!isSubdomain) {
    debug('Not on a subdomain, no fixes needed');
    return;
  }
  
  // Determine which root domain to use for resource loading
  const rootDomain = 'handbok.org';
  
  // Track resource loading issues
  const resourceStatus = {
    totalRequests: 0,
    failedRequests: 0,
    redirectLoops: 0,
    criticalResourcesFailed: false,
    failedResources: new Set(),
    emergencyModeActive: false
  };
  
  // Detect and break redirect loops
  try {
    const redirectCounter = Number(sessionStorage.getItem('resource_redirect_count') || '0');
    
    if (redirectCounter > 5) {
      console.error('[Resource Fix] Resource redirect loop detected - applying emergency CSS');
      applyEmergencyStyles();
      resourceStatus.emergencyModeActive = true;
      resourceStatus.redirectLoops++;
      
      // Reset counter
      sessionStorage.setItem('resource_redirect_count', '0');
      
      // Show emergency message
      addEmergencyNotice();
      
      // Continue with script for error monitoring, but don't actively fix resources
    } else {
      // Increment counter when accessing resources
      sessionStorage.setItem('resource_redirect_count', (redirectCounter + 1).toString());
      
      // Reset after 10 seconds if no issues
      setTimeout(function() {
        sessionStorage.setItem('resource_redirect_count', '0');
      }, 10000);
    }
  } catch (e) {
    console.warn('[Resource Fix] Error with redirect detection:', e);
  }
  
  // Resource loading strategies in order of preference
  const LOADING_STRATEGIES = {
    DIRECT_URL: 'direct',    // Direct URL to the main domain (fastest)
    PROXY_API: 'proxy',      // Use the proxy API (more reliable but slower)
    INLINE_CONTENT: 'inline' // Use inline content as fallback (emergency)
  };
  
  // Start with the fastest strategy
  let selectedStrategy = LOADING_STRATEGIES.DIRECT_URL;
  
  // Track loading failures to dynamically adjust strategy
  let directUrlFailureCount = 0;
  let proxyApiFailureCount = 0;
  
  // Critical resources that must be loaded for the page to function
  const CRITICAL_RESOURCES = [
    '/_next/static/css/',
    '/_next/static/chunks/',
    'main',
    'styles.css'
  ];
  
  // Helper function to check if a resource is critical
  function isCriticalResource(url) {
    return CRITICAL_RESOURCES.some(pattern => url.includes(pattern));
  }
  
  // Helper function to check if a URL is a static resource
  function isStaticResource(url) {
    if (typeof url !== 'string') return false;
    
    return url.includes('/_next/static/') || 
           url.endsWith('.css') || 
           url.endsWith('.js') ||
           url.includes('/static/') ||
           url.includes('/fonts/') ||
           url.includes('/assets/') ||
           url.endsWith('.woff') ||
           url.endsWith('.woff2') ||
           url.endsWith('.ttf') ||
           url.endsWith('.png') ||
           url.endsWith('.jpg') ||
           url.endsWith('.svg');
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
      
      // Add timestamp to prevent caching issues with problem resources
      const timestamp = resourceStatus.failedResources.has(originalUrl) ? 
        `&t=${Date.now()}` : '';
      
      return `/api/resources?path=${encodeURIComponent(resourcePath)}${timestamp}`;
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
    
    // Increment total requests counter
    resourceStatus.totalRequests++;
    
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
      
      case LOADING_STRATEGIES.INLINE_CONTENT:
        // In inline mode, we'll still return a URL but separately apply fallbacks
        return createProxyUrl(originalUrl);
      
      default:
        return createDirectUrl(originalUrl);
    }
  }
  
  // Downgrade to next strategy if current one isn't working
  function downgradeStrategyIfNeeded(failedUrl) {
    // Track failed resource
    if (failedUrl) {
      resourceStatus.failedRequests++;
      resourceStatus.failedResources.add(failedUrl);
      
      // Check if it was a critical resource
      if (isCriticalResource(failedUrl)) {
        resourceStatus.criticalResourcesFailed = true;
      }
    }
    
    debug(`Resource stats: ${resourceStatus.failedRequests}/${resourceStatus.totalRequests} failed`);
    
    // If failure rate is over 30%, consider downgrading
    const failureRate = resourceStatus.totalRequests > 0 ? 
      resourceStatus.failedRequests / resourceStatus.totalRequests : 0;
    
    if (selectedStrategy === LOADING_STRATEGIES.DIRECT_URL) {
      directUrlFailureCount++;
      
      if (directUrlFailureCount >= 3 || failureRate > 0.3 || resourceStatus.criticalResourcesFailed) {
        console.log('[Resource Fix] Direct URL strategy failing, switching to proxy API');
        selectedStrategy = LOADING_STRATEGIES.PROXY_API;
        
        // Apply proxy to previously failed resources
        fixExistingTags();
      }
    } else if (selectedStrategy === LOADING_STRATEGIES.PROXY_API) {
      proxyApiFailureCount++;
      
      if (proxyApiFailureCount >= 3 || failureRate > 0.5 || 
         (resourceStatus.criticalResourcesFailed && resourceStatus.failedRequests > 5)) {
        console.log('[Resource Fix] Proxy API failing too often, applying emergency styles');
        selectedStrategy = LOADING_STRATEGIES.INLINE_CONTENT;
        
        // Apply emergency styles
        applyEmergencyStyles();
        
        // Add emergency notice
        addEmergencyNotice();
      }
    }
  }
  
  // Apply emergency styles when all else fails
  function applyEmergencyStyles() {
    if (document.getElementById('emergency-css')) return;
    
    const style = document.createElement('style');
    style.id = 'emergency-css';
    style.innerHTML = `
      /* Emergency styles to ensure page remains usable */
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
        margin-bottom: 1rem;
      }
      
      /* Containers and layout */
      .container, main, section {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      th, td {
        text-align: left;
        padding: 0.5rem;
        border-bottom: 1px solid #eee;
      }
      
      /* Forms */
      form {
        margin-bottom: 2rem;
      }
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }
      
      /* Emergency notification */
      .emergency-notice {
        padding: 10px 15px;
        margin: 10px 0;
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeeba;
        border-radius: 4px;
        font-size: 14px;
      }
    `;
    
    // Always try to prepend to head first for highest priority
    document.head.insertBefore(style, document.head.firstChild);
    
    console.log('[Resource Fix] Emergency styles applied');
  }
  
  // Add emergency notice to the page
  function addEmergencyNotice() {
    if (document.querySelector('.emergency-notice')) return;
    
    const notice = document.createElement('div');
    notice.className = 'emergency-notice';
    notice.innerHTML = '<strong>Nödfallsläge:</strong> Resurser kunde inte laddas korrekt. Sidan visas med begränsad formatering.';
    
    // Insert at top of body when it's available
    function insertNotice() {
      if (document.body && !document.querySelector('.emergency-notice')) {
        document.body.insertBefore(notice, document.body.firstChild);
      }
    }
    
    if (document.body) {
      insertNotice();
    } else {
      document.addEventListener('DOMContentLoaded', insertNotice);
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
  
  /**
   * Fix existing resource tags in the document
   */
  function fixExistingTags() {
    debug('Fixing existing resource tags');
    
    // Fix existing link tags (CSS)
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(linkTag => {
      const originalHref = linkTag.getAttribute('href');
      if (originalHref && isStaticResource(originalHref)) {
        // Don't rewrite already rewritten URLs
        if (originalHref.includes(`${rootDomain}/`) || originalHref.includes('/api/resources')) {
          return;
        }
        
        // Mark this tag as processed
        linkTag.setAttribute('data-resource-fixed', 'true');
        
        // Store original URL
        linkTag.setAttribute('data-original-href', originalHref);
        
        // Update href with the appropriate strategy
        const newHref = getResourceUrl(originalHref);
        linkTag.setAttribute('href', newHref);
        
        debug(`Fixed CSS link: ${originalHref} -> ${newHref}`);
        
        // Add error handling
        linkTag.addEventListener('error', function(e) {
          console.error(`[Resource Fix] CSS loading failed: ${newHref}`);
          downgradeStrategyIfNeeded(originalHref);
          
          // Try again with a different strategy
          if (selectedStrategy !== LOADING_STRATEGIES.DIRECT_URL) {
            const retryHref = getResourceUrl(originalHref);
            if (retryHref !== newHref) {
              linkTag.setAttribute('href', retryHref);
              debug(`Retrying CSS with: ${retryHref}`);
            }
          }
          
          // If it's a critical CSS resource and we're in emergency mode,
          // inject a minimal inline style
          if (isCriticalResource(originalHref) && 
              selectedStrategy === LOADING_STRATEGIES.INLINE_CONTENT) {
            applyEmergencyStyles();
          }
        });
      }
    });
    
    // Fix existing script tags (JS)
    const scriptTags = document.querySelectorAll('script[src]');
    scriptTags.forEach(scriptTag => {
      const originalSrc = scriptTag.getAttribute('src');
      if (originalSrc && isStaticResource(originalSrc)) {
        // Don't rewrite already rewritten URLs
        if (originalSrc.includes(`${rootDomain}/`) || originalSrc.includes('/api/resources')) {
          return;
        }
        
        // Mark this tag as processed
        scriptTag.setAttribute('data-resource-fixed', 'true');
        
        // Store original URL
        scriptTag.setAttribute('data-original-src', originalSrc);
        
        // Update src with the appropriate strategy
        const newSrc = getResourceUrl(originalSrc);
        scriptTag.setAttribute('src', newSrc);
        
        debug(`Fixed script: ${originalSrc} -> ${newSrc}`);
        
        // Add error handling
        scriptTag.addEventListener('error', function(e) {
          console.error(`[Resource Fix] Script loading failed: ${newSrc}`);
          downgradeStrategyIfNeeded(originalSrc);
          
          // Critical scripts might need replacement
          if (isCriticalResource(originalSrc) && 
              selectedStrategy === LOADING_STRATEGIES.INLINE_CONTENT) {
            // For critical scripts, you might want to provide fallback functionality
            const fallbackScript = document.createElement('script');
            fallbackScript.textContent = `
              console.warn("Fallback script loaded for ${originalSrc}");
              // Add minimal fallback functionality if needed
            `;
            document.head.appendChild(fallbackScript);
          }
        });
      }
    });
    
    // Fix image tags
    const imgTags = document.querySelectorAll('img[src]');
    imgTags.forEach(imgTag => {
      const originalSrc = imgTag.getAttribute('src');
      if (originalSrc && isStaticResource(originalSrc)) {
        // Don't rewrite already rewritten URLs
        if (originalSrc.includes(`${rootDomain}/`) || originalSrc.includes('/api/resources')) {
          return;
        }
        
        // Mark this tag as processed
        imgTag.setAttribute('data-resource-fixed', 'true');
        
        // Store original URL
        imgTag.setAttribute('data-original-src', originalSrc);
        
        // Update src with the appropriate strategy
        const newSrc = getResourceUrl(originalSrc);
        imgTag.setAttribute('src', newSrc);
        
        debug(`Fixed image: ${originalSrc} -> ${newSrc}`);
        
        // Add error handling
        imgTag.addEventListener('error', function(e) {
          console.error(`[Resource Fix] Image loading failed: ${newSrc}`);
          downgradeStrategyIfNeeded(originalSrc);
          
          // Retry with a different strategy for critical images
          if (selectedStrategy !== LOADING_STRATEGIES.DIRECT_URL) {
            const retryHref = getResourceUrl(originalSrc);
            if (retryHref !== newSrc) {
              imgTag.setAttribute('src', retryHref);
              debug(`Retrying image with: ${retryHref}`);
            }
          }
        });
      }
    });
    
    // Fix background images in inline styles
    const elementsWithStyle = document.querySelectorAll('[style*="url("]');
    elementsWithStyle.forEach(el => {
      const originalStyle = el.getAttribute('style');
      if (originalStyle) {
        // Find and replace all url() patterns in the style
        const newStyle = originalStyle.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, url) => {
          if (isStaticResource(url)) {
            const newUrl = getResourceUrl(url);
            return `url('${newUrl}')`;
          }
          return match;
        });
        
        if (originalStyle !== newStyle) {
          // Save original style
          el.setAttribute('data-original-style', originalStyle);
          
          // Update with new style
          el.setAttribute('style', newStyle);
          debug('Fixed inline style with background image');
        }
      }
    });
    
    // Fix font face URLs in style tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(styleTag => {
      const cssText = styleTag.textContent;
      
      // Check if it contains font face or url() references
      if (cssText && (cssText.includes('@font-face') || cssText.includes('url('))) {
        const newCssText = cssText.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, url) => {
          if (isStaticResource(url)) {
            const newUrl = getResourceUrl(url);
            return `url('${newUrl}')`;
          }
          return match;
        });
        
        if (cssText !== newCssText) {
          // Save original CSS text as data attribute
          styleTag.setAttribute('data-original-css', cssText);
          
          // Update with new CSS text
          styleTag.textContent = newCssText;
          debug('Fixed font face URLs in style tag');
        }
      }
    });
  }
  
  /**
   * Set up mutation observer to fix dynamically added elements
   */
  function setupMutationObserver() {
    debug('Setting up mutation observer');
    
    // Skip if already observed
    if (window._resourceFixObserverActive) return;
    
    // Create an observer instance
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Process added nodes
        if (mutation.addedNodes && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            // Only process element nodes
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            
            // Fix link tags
            if (node.tagName === 'LINK' && node.getAttribute('rel') === 'stylesheet') {
              const href = node.getAttribute('href');
              if (href && isStaticResource(href) && !node.getAttribute('data-resource-fixed')) {
                // Store original URL
                node.setAttribute('data-original-href', href);
                
                // Update with new URL
                const newHref = getResourceUrl(href);
                node.setAttribute('href', newHref);
                
                // Mark as fixed
                node.setAttribute('data-resource-fixed', 'true');
                
                debug(`Fixed dynamically added CSS link: ${href} -> ${newHref}`);
                
                // Add error event listener
                node.addEventListener('error', () => {
                  console.error(`[Resource Fix] Dynamically added CSS failed to load: ${newHref}`);
                  downgradeStrategyIfNeeded(href);
                });
              }
            }
            
            // Fix script tags
            if (node.tagName === 'SCRIPT' && node.getAttribute('src')) {
              const src = node.getAttribute('src');
              if (src && isStaticResource(src) && !node.getAttribute('data-resource-fixed')) {
                // Store original URL
                node.setAttribute('data-original-src', src);
                
                // Update with new URL
                const newSrc = getResourceUrl(src);
                node.setAttribute('src', newSrc);
                
                // Mark as fixed
                node.setAttribute('data-resource-fixed', 'true');
                
                debug(`Fixed dynamically added script: ${src} -> ${newSrc}`);
                
                // Add error event listener
                node.addEventListener('error', () => {
                  console.error(`[Resource Fix] Dynamically added script failed to load: ${newSrc}`);
                  downgradeStrategyIfNeeded(src);
                });
              }
            }
            
            // Fix img tags
            if (node.tagName === 'IMG' && node.getAttribute('src')) {
              const src = node.getAttribute('src');
              if (src && isStaticResource(src) && !node.getAttribute('data-resource-fixed')) {
                // Store original URL
                node.setAttribute('data-original-src', src);
                
                // Update with new URL
                const newSrc = getResourceUrl(src);
                node.setAttribute('src', newSrc);
                
                // Mark as fixed
                node.setAttribute('data-resource-fixed', 'true');
                
                debug(`Fixed dynamically added image: ${src} -> ${newSrc}`);
                
                // Add error event listener
                node.addEventListener('error', () => {
                  console.error(`[Resource Fix] Dynamically added image failed to load: ${newSrc}`);
                  downgradeStrategyIfNeeded(src);
                });
              }
            }
            
            // Check all child nodes recursively
            if (node.querySelectorAll) {
              // Fix links in children
              const childLinks = node.querySelectorAll('link[rel="stylesheet"]:not([data-resource-fixed])');
              childLinks.forEach(linkNode => {
                const href = linkNode.getAttribute('href');
                if (href && isStaticResource(href)) {
                  // Store original URL
                  linkNode.setAttribute('data-original-href', href);
                  
                  // Update with new URL
                  const newHref = getResourceUrl(href);
                  linkNode.setAttribute('href', newHref);
                  
                  // Mark as fixed
                  linkNode.setAttribute('data-resource-fixed', 'true');
                  
                  debug(`Fixed CSS link in dynamic content: ${href} -> ${newHref}`);
                  
                  // Add error event listener
                  linkNode.addEventListener('error', () => {
                    console.error(`[Resource Fix] CSS in dynamic content failed to load: ${newHref}`);
                    downgradeStrategyIfNeeded(href);
                  });
                }
              });
              
              // Fix scripts in children
              const childScripts = node.querySelectorAll('script[src]:not([data-resource-fixed])');
              childScripts.forEach(scriptNode => {
                const src = scriptNode.getAttribute('src');
                if (src && isStaticResource(src)) {
                  // Store original URL
                  scriptNode.setAttribute('data-original-src', src);
                  
                  // Update with new URL
                  const newSrc = getResourceUrl(src);
                  scriptNode.setAttribute('src', newSrc);
                  
                  // Mark as fixed
                  scriptNode.setAttribute('data-resource-fixed', 'true');
                  
                  debug(`Fixed script in dynamic content: ${src} -> ${newSrc}`);
                  
                  // Add error event listener
                  scriptNode.addEventListener('error', () => {
                    console.error(`[Resource Fix] Script in dynamic content failed to load: ${newSrc}`);
                    downgradeStrategyIfNeeded(src);
                  });
                }
              });
              
              // Fix images in children
              const childImages = node.querySelectorAll('img[src]:not([data-resource-fixed])');
              childImages.forEach(imgNode => {
                const src = imgNode.getAttribute('src');
                if (src && isStaticResource(src)) {
                  // Store original URL
                  imgNode.setAttribute('data-original-src', src);
                  
                  // Update with new URL
                  const newSrc = getResourceUrl(src);
                  imgNode.setAttribute('src', newSrc);
                  
                  // Mark as fixed
                  imgNode.setAttribute('data-resource-fixed', 'true');
                  
                  debug(`Fixed image in dynamic content: ${src} -> ${newSrc}`);
                  
                  // Add error event listener
                  imgNode.addEventListener('error', () => {
                    console.error(`[Resource Fix] Image in dynamic content failed to load: ${newSrc}`);
                    downgradeStrategyIfNeeded(src);
                  });
                }
              });
            }
          });
        }
      });
    });
    
    // Start observing the document
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    
    // Mark as active
    window._resourceFixObserverActive = true;
    
    debug('Mutation observer active');
  }
  
  /**
   * Monitor resource loading errors globally
   */
  function setupErrorMonitoring() {
    debug('Setting up error monitoring');
    
    // Skip if already set up
    if (window._resourceFixErrorHandlerActive) return;
    
    // Listen for resource loading errors
    window.addEventListener('error', function(e) {
      const target = e.target;
      
      // Only handle resource loading errors (not JS errors)
      if (!target || !target.tagName) return;
      
      // Handle various resource types
      if (target.tagName === 'LINK' || target.tagName === 'SCRIPT' || target.tagName === 'IMG') {
        const url = target.src || target.href;
        
        if (url && isStaticResource(url)) {
          console.warn('[Resource Fix] Resource loading failed:', url);
          
          // Check if this is already a rewritten URL
          if (url.includes(`${rootDomain}/`) || url.includes('/api/resources')) {
            // Track failure
            downgradeStrategyIfNeeded(url);
          } else {
            // Fix unfixed URL
            const newUrl = getResourceUrl(url);
            
            // Only update if different
            if (newUrl !== url) {
              debug(`Fixing failed resource: ${url} -> ${newUrl}`);
              target.src ? target.src = newUrl : target.href = newUrl;
            }
          }
        }
      }
    }, true);
    
    // Mark as active
    window._resourceFixErrorHandlerActive = true;
    
    debug('Error monitoring active');
  }
  
  /**
   * Apply font loading fixes and fallbacks
   */
  function applyFontFixes() {
    debug('Applying font fixes');
    
    // Add font loading status check
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        // Check if fonts loaded successfully
        const geistLoaded = document.fonts.check('1em Geist');
        const geistMonoLoaded = document.fonts.check('1em "Geist Mono"');
        
        if (!geistLoaded || !geistMonoLoaded) {
          console.warn('[Resource Fix] Font loading failed, applying fallbacks');
          
          // Apply a font fallback style
          const style = document.createElement('style');
          style.innerHTML = `
            /* Font fallbacks for failed loading */
            .font-sans, .font-geist-sans, [class*="--font-geist-sans"] { 
              font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, Arial, sans-serif !important; 
            }
            .font-mono, .font-geist-mono, [class*="--font-geist-mono"] { 
              font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; 
            }
          `;
          document.head.appendChild(style);
          
          debug('Font fallbacks applied');
        }
      }).catch(function(err) {
        console.error('[Resource Fix] Font loading error:', err);
      });
    }
  }
  
  /**
   * Initialize all fixes
   */
  function init() {
    debug('Initializing resource fix');
    
    // Don't apply fixes if we detected a redirect loop
    if (resourceStatus.emergencyModeActive) {
      console.log('[Resource Fix] Running in emergency mode (monitoring only)');
    } else {
      // Fix existing tags
      fixExistingTags();
      
      // Apply font fixes
      applyFontFixes();
    }
    
    // Set up monitoring regardless of mode
    setupMutationObserver();
    setupErrorMonitoring();
    
    // Expose API for debugging
    window.resourceFixStatus = {
      getStatus: function() {
        return {
          strategy: selectedStrategy,
          stats: resourceStatus,
          emergencyMode: resourceStatus.emergencyModeActive
        };
      },
      forceStrategy: function(strategy) {
        if (LOADING_STRATEGIES[strategy]) {
          selectedStrategy = LOADING_STRATEGIES[strategy];
          fixExistingTags(); // Reapply fixes
          return true;
        }
        return false;
      }
    };
    
    debug('Resource fix initialized');
  }
  
  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Static Resource Fix - helps with cross-domain resource loading
(function() {
  const isSubdomain = window.location.hostname.split('.').length > 2 && 
                      window.location.hostname.indexOf('handbok.org') > -1;
                      
  if (!isSubdomain) return; // Only run on subdomains
  
  // Fix for font and static resources
  function fixStaticResources() {
    // Fix for font files
    document.querySelectorAll('link[rel="preload"][as="font"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.includes('.woff2') || href.includes('.woff') || href.includes('.ttf'))) {
        const mainDomainUrl = `https://handbok.org${href}`;
        link.setAttribute('href', mainDomainUrl);
      }
    });
    
    // Fix for CSS files
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/_next/')) {
        const mainDomainUrl = `https://handbok.org${href}`;
        link.setAttribute('href', mainDomainUrl);
      }
    });
    
    // Fix for script files
    document.querySelectorAll('script[src]').forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.startsWith('/_next/')) {
        const mainDomainUrl = `https://handbok.org${src}`;
        script.setAttribute('src', mainDomainUrl);
      }
    });
  }
  
  // Safe local storage access
  function createSafeStorage() {
    let memoryStorage = {};
    
    const safeStorage = {
      getItem: function(key) {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.warn('LocalStorage access failed, using memory storage', e);
          return memoryStorage[key] || null;
        }
      },
      setItem: function(key, value) {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('LocalStorage access failed, using memory storage', e);
          memoryStorage[key] = value;
        }
      },
      removeItem: function(key) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('LocalStorage access failed, using memory storage', e);
          delete memoryStorage[key];
        }
      }
    };
    
    // Replace localStorage access
    try {
      Object.defineProperty(window, 'safeLocalStorage', { 
        value: safeStorage,
        writable: false
      });
    } catch (e) {
      console.error('Failed to define safeLocalStorage', e);
    }
  }
  
  // Fix for favicon
  function fixFavicon() {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = 'https://handbok.org/favicon.ico';
    } else {
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.href = 'https://handbok.org/favicon.ico';
      document.head.appendChild(newFavicon);
    }
  }
  
  // Run fixes once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      fixStaticResources();
      createSafeStorage();
      fixFavicon();
    });
  } else {
    fixStaticResources();
    createSafeStorage();
    fixFavicon();
  }
  
  // Observe DOM changes to fix any dynamically added resources
  if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      fixStaticResources();
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})(); 