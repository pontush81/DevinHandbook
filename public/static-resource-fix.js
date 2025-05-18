/**
 * static-resource-fix.js - Hjälper till att lösa CORS-problem för statiska resurser
 * 
 * Detta skript fångar upp problem med att ladda CSS och andra statiska resurser
 * och omdirigerar misslyckade förfrågningar via vår proxy.
 */
(function() {
  console.log('[Static Resource Fix] Initializing...');

  // Här lagrar vi resurser som redan har omriktats för att undvika loopar
  const processedUrls = new Set();
  
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
})(); 