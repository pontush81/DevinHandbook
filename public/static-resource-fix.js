/**
 * static-resource-fix.js - Hjälper till att lösa CORS-problem för statiska resurser
 * 
 * Detta skript fångar upp problem med att ladda CSS och andra statiska resurser
 * och omdirigerar misslyckade förfrågningar via vår proxy.
 */
(function() {
  // Kör bara i webbläsaren, inte på server
  if (typeof window === 'undefined') return;
  
  console.log('[Static Resource Fix] Initializing...');

  // Här lagrar vi resurser som redan har omriktats för att undvika loopar
  const processedUrls = new Set();
  
  // URL till vår proxy-endpoint
  const PROXY_ENDPOINT = '/api/proxy-static';
  
  // Lista över resurser som vi har försökt fixa
  const attemptedFixes = new Set();
  
  // Funktion för att få en absolut URL
  function getAbsoluteUrl(url) {
    try {
      return new URL(url, window.location.origin).toString();
    } catch (error) {
      console.error('[Static Resource Fix] Invalid URL:', url, error);
      return url;
    }
  }
  
  // Funktion för att kolla om en URL är för en statisk resurs
  function isStaticResource(url) {
    return url.includes('/_next/') || 
           url.includes('/static/') ||
           url.includes('/fonts/') ||
           url.includes('/images/') ||
           url.match(/\.(css|js|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf)(\?.*)?$/i);
  }
  
  // Funktion för att skapa proxy-URL för en resurs
  function createProxyUrl(url) {
    // Kontrollera att det är en fullständig URL
    const absoluteUrl = getAbsoluteUrl(url);
    return `/api/proxy-static?url=${encodeURIComponent(absoluteUrl)}`;
  }
  
  // Fixa befintliga stil- och skriptreferenser
  function fixExistingTags() {
    // Fixa CSS-länkar
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (processedUrls.has(link.href)) return;
      
      const originalHref = link.href;
      if (isStaticResource(originalHref)) {
        processedUrls.add(originalHref);
        
        // Skapa en "clone" av länken med proxy-URL
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = createProxyUrl(originalHref);
        // Kopiera andra attribut
        Array.from(link.attributes).forEach(attr => {
          if (attr.name !== 'href') {
            newLink.setAttribute(attr.name, attr.value);
          }
        });
        
        // Lyssna efter laddningsfel på originalet
        link.onerror = function(e) {
          console.log('[Static Resource Fix] CSS load error, using proxy:', originalHref);
          link.parentNode.insertBefore(newLink, link.nextSibling);
        };
        
        // Om länken redan har fallerat (om skriptet laddas efter felet)
        setTimeout(() => {
          if (!document.styleSheets.length || 
              Array.from(document.styleSheets).some(sheet => 
                sheet.href === originalHref && sheet.cssRules.length === 0)) {
            console.log('[Static Resource Fix] CSS failed, switching to proxy:', originalHref);
            link.parentNode.insertBefore(newLink, link.nextSibling);
          }
        }, 500);
      }
    });
    
    // Fixa script-element
    document.querySelectorAll('script[src]').forEach(script => {
      if (processedUrls.has(script.src)) return;
      
      const originalSrc = script.src;
      if (isStaticResource(originalSrc)) {
        processedUrls.add(originalSrc);
        
        script.onerror = function(e) {
          console.log('[Static Resource Fix] Script load error, using proxy:', originalSrc);
          
          const newScript = document.createElement('script');
          newScript.src = createProxyUrl(originalSrc);
          // Kopiera andra attribut
          Array.from(script.attributes).forEach(attr => {
            if (attr.name !== 'src') {
              newScript.setAttribute(attr.name, attr.value);
            }
          });
          
          script.parentNode.insertBefore(newScript, script.nextSibling);
        };
      }
    });
    
    // Fixa bild-element
    document.querySelectorAll('img[src]').forEach(img => {
      if (processedUrls.has(img.src)) return;
      
      const originalSrc = img.src;
      if (isStaticResource(originalSrc)) {
        processedUrls.add(originalSrc);
        
        img.onerror = function(e) {
          console.log('[Static Resource Fix] Image load error, using proxy:', originalSrc);
          img.src = createProxyUrl(originalSrc);
        };
      }
    });
  }
  
  // Övervaka nya DOM-element för att fixa dem
  function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Kolla om det är ett link, script eller img-element
              if (node.tagName === 'LINK' || node.tagName === 'SCRIPT' || node.tagName === 'IMG') {
                // Vänta lite så att elementen hinner laddas in
                setTimeout(() => fixExistingTags(), 0);
              }
              
              // Eller om det innehåller sådana element
              if (node.querySelectorAll) {
                const hasResourceElements = node.querySelectorAll('link, script, img').length > 0;
                if (hasResourceElements) {
                  setTimeout(() => fixExistingTags(), 0);
                }
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
    return observer;
  }

  // Övervaka nätverksfel
  function interceptFetch() {
    // Spara original fetch
    const originalFetch = window.fetch;
    
    // Ersätt fetch för att hantera CORS-fel
    window.fetch = async function(resource, options) {
      try {
        const response = await originalFetch.apply(this, arguments);
        return response;
      } catch (error) {
        const url = typeof resource === 'string' ? resource : resource.url;
        console.log('[Static Resource Fix] Fetch error:', error.message, url);
        
        // Om det är ett CORS-fel och det är en statisk resurs som vi inte redan har bearbetat
        if ((error.message.includes('CORS') || error.message.includes('Failed to fetch')) && 
            isStaticResource(url) && !processedUrls.has(url)) {
          processedUrls.add(url);
          console.log('[Static Resource Fix] Trying via proxy:', url);
          
          // Försök hämta via proxy istället
          return originalFetch(createProxyUrl(url), options);
        }
        
        throw error;
      }
    };
  }
  
  // Huvudfunktion - initialisera alla mekanismer
  function init() {
    try {
      fixExistingTags();
      const observer = setupMutationObserver();
      interceptFetch();
      
      console.log('[Static Resource Fix] Successfully initialized');
      
      // Notera att skriptet har körts för att undvika dubbla laddningar
      window.__STATIC_RESOURCE_FIX_LOADED__ = true;
      
      return {
        processedUrls,
        refreshElements: fixExistingTags,
        observer
      };
    } catch (error) {
      console.error('[Static Resource Fix] Initialization error:', error);
    }
  }
  
  // Kör bara om skriptet inte redan har laddats
  if (!window.__STATIC_RESOURCE_FIX_LOADED__) {
    window.__STATIC_RESOURCE_FIX = init();
  }

  // Intercepta fetch-anrop för att hantera CORS-fel för Next.js statiska resurser
  const originalFetch = window.fetch;
  window.fetch = async function(resource, options) {
    // Försök med normalt anrop först
    try {
      return await originalFetch(resource, options);
    } catch (error) {
      // Om det är ett CORS-fel och resursen är från handbok.org
      const url = resource.toString();
      if ((error.message && error.message.includes('CORS')) || error.name === 'TypeError') {
        if (
          url.includes('handbok.org/_next/') &&
          !attemptedFixes.has(url) &&
          (url.includes('/static/media/') || url.includes('/static/css/') || url.includes('/static/chunks/'))
        ) {
          console.log('Intercepting CORS error for: ' + url);
          attemptedFixes.add(url);
          
          // Extrahera path från URL
          const urlObj = new URL(url);
          const path = urlObj.pathname;
          
          // Använd vår proxy istället
          const proxyUrl = PROXY_ENDPOINT + '?path=' + encodeURIComponent(path);
          console.log('Redirecting to proxy: ' + proxyUrl);
          return originalFetch(proxyUrl, options);
        }
      }
      
      // Kasta om felet om vi inte kunde hantera det
      throw error;
    }
  };
  
  // Mutation Observer för att detektera och fixa CSS-länkar med CORS-fel
  function setupMutationObserver() {
    if (!window.MutationObserver) return;
    
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          Array.from(mutation.addedNodes).forEach(function(node) {
            // Fixa link-element (CSS)
            if (node.nodeName === 'LINK' && node.rel === 'stylesheet') {
              const linkElement = node;
              const originalHref = linkElement.href;
              
              if (originalHref && originalHref.includes('handbok.org/_next/static/css/') && !attemptedFixes.has(originalHref)) {
                // Fixa CORS för CSS-filer
                linkElement.addEventListener('error', function(e) {
                  if (!attemptedFixes.has(originalHref)) {
                    attemptedFixes.add(originalHref);
                    const path = new URL(originalHref).pathname;
                    const proxyUrl = PROXY_ENDPOINT + '?path=' + encodeURIComponent(path);
                    console.log('Fixing CSS CORS issue: ' + originalHref + ' -> ' + proxyUrl);
                    linkElement.href = proxyUrl;
                  }
                });
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  
  // Fixa font-fel genom att övervaka console errors
  function fixFontLoading() {
    // Lyssna på console errors från fonter
    const originalConsoleError = console.error;
    console.error = function() {
      const args = Array.from(arguments);
      const errorMsg = args.join(' ');
      if (
        errorMsg.includes('Access to font') && 
        errorMsg.includes('has been blocked by CORS policy')
      ) {
        const match = errorMsg.match(/at ['"]([^'"]+)['"]/);
        if (match && match[1]) {
          const fontUrl = match[1];
          if (!attemptedFixes.has(fontUrl) && fontUrl.includes('handbok.org/_next/static/media/')) {
            attemptedFixes.add(fontUrl);
            
            // Extrahera path och skapa proxy-URL
            const path = new URL(fontUrl).pathname;
            const proxyUrl = PROXY_ENDPOINT + '?path=' + encodeURIComponent(path);
            
            console.log('Fixing font CORS issue: ' + fontUrl + ' -> ' + proxyUrl);
            
            // Skapa en ny style tag med uppdaterade font-sources
            const style = document.createElement('style');
            style.textContent = 
              '@font-face {' +
              '  font-family: "__font_fixed";' +
              '  src: url("' + proxyUrl + '") format("woff2");' +
              '  font-display: swap;' +
              '}';
            document.head.appendChild(style);
          }
        }
      }
      originalConsoleError.apply(console, args);
    };
  }
  
  // Initiera våra fixar
  function init() {
    console.log('Initializing static resource CORS fix');
    setupMutationObserver();
    fixFontLoading();
    
    // Lyssna på DOMContentLoaded för att hantera tidiga CSS-laddningar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        // Fixa existerande stilar som redan har laddats
        document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link) {
          const href = link.href;
          if (href && href.includes('handbok.org/_next/static/css/') && !attemptedFixes.has(href)) {
            link.addEventListener('error', function() {
              if (!attemptedFixes.has(href)) {
                attemptedFixes.add(href);
                const path = new URL(href).pathname;
                const proxyUrl = PROXY_ENDPOINT + '?path=' + encodeURIComponent(path);
                console.log('Fixing initial CSS CORS issue: ' + href + ' -> ' + proxyUrl);
                link.href = proxyUrl;
              }
            });
          }
        });
      });
    }
  }
  
  // Starta vår lösning när scriptet laddat
  init();
})(); 