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
  console.log('Static resource fix script loaded');
  
  // Get the current hostname
  const currentHost = window.location.hostname;
  console.log('Current host:', currentHost);
  
  // Determine if we're on a subdomain
  const isSubdomain = currentHost.endsWith('.handbok.org') && 
                      currentHost !== 'handbok.org' && 
                      currentHost !== 'www.handbok.org';
  
  // Handle test or regular subdomain pattern
  let subdomainType = 'regular';
  if (currentHost.includes('.test.')) {
    subdomainType = 'nested-test';
  } else if (currentHost.startsWith('test.')) {
    subdomainType = 'test';
  }
  
  console.log(`Subdomain detected: ${isSubdomain}, type: ${subdomainType}`);
  
  // Helper function to check if a URL is a static resource
  function isStaticResource(url) {
    return url.includes('/_next/static/') || 
           url.includes('.css') || 
           url.includes('.js') ||
           url.includes('/static/') ||
           url.includes('/fonts/') ||
           url.includes('/assets/');
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
  
  // Override fetch to intercept requests for static resources
  const originalFetch = window.fetch;
  window.fetch = function(resource, init) {
    try {
      if (typeof resource === 'string') {
        // Handle paths containing _next/static or ending with .css/.js
        if (isStaticResource(resource)) {
          console.log('Intercepting fetch for:', resource);
          const proxyUrl = createProxyUrl(resource);
          console.log('Redirecting through proxy:', proxyUrl);
          return originalFetch(proxyUrl, init);
        }
        
        // Handle absolute URLs pointing to handbok.org
        if (resource.includes('handbok.org') && isStaticResource(resource)) {
          console.log('Intercepting cross-domain fetch for:', resource);
          const proxyUrl = createProxyUrl(resource);
          console.log('Redirecting through proxy:', proxyUrl);
          return originalFetch(proxyUrl, init);
        }
      }
    } catch (e) {
      console.error('Error in fetch override:', e);
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  // Fix existing <link> and <script> tags
  function fixExistingTags() {
    // Fix CSS links
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && isStaticResource(href) && !href.startsWith('/api/resources')) {
        console.log('Fixing CSS link:', href);
        link.setAttribute('href', createProxyUrl(href));
      }
    });
    
    // Fix JS scripts
    document.querySelectorAll('script[src]').forEach(script => {
      const src = script.getAttribute('src');
      if (src && isStaticResource(src) && !src.startsWith('/api/resources')) {
        console.log('Fixing script src:', src);
        script.setAttribute('src', createProxyUrl(src));
      }
    });
    
    // Fix font loading
    document.querySelectorAll('link[rel="preload"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('/fonts/') && !href.startsWith('/api/resources')) {
        console.log('Fixing font preload link:', href);
        link.setAttribute('href', createProxyUrl(href));
      }
    });
  }
  
  // Set up MutationObserver to fix dynamically added elements
  function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          // Handle add link elements (CSS, fonts)
          if (node.tagName === 'LINK') {
            const href = node.getAttribute('href');
            if (href && isStaticResource(href) && !href.startsWith('/api/resources')) {
              console.log('Fixing dynamically added link:', href);
              node.setAttribute('href', createProxyUrl(href));
            }
          } 
          // Handle script elements
          else if (node.tagName === 'SCRIPT' && node.getAttribute('src')) {
            const src = node.getAttribute('src');
            if (src && isStaticResource(src) && !src.startsWith('/api/resources')) {
              console.log('Fixing dynamically added script:', src);
              node.setAttribute('src', createProxyUrl(src));
            }
          }
        });
      });
    });
    
    observer.observe(document, { 
      childList: true, 
      subtree: true 
    });
    
    return observer;
  }
  
  // Run fixes
  function applyFixes() {
    console.log('Applying static resource fixes for ' + subdomainType + ' subdomain');
    fixExistingTags();
    const observer = setupMutationObserver();
    
    // Expose diagnostics on window
    window.resourceFixDiagnostics = {
      applied: true,
      timestamp: new Date().toISOString(),
      observer: observer,
      type: subdomainType,
      host: currentHost
    };
    
    console.log('Static resource fixes applied successfully');
  }
  
  // Apply fixes when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixes);
  } else {
    applyFixes();
  }
})(); 