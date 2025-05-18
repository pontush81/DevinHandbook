/**
 * Static Resource Fix
 * Enkel lösning för subdomäner på handbok.org
 */
(function() {
  // Kontrollera om vi är på en subdomän
  const currentDomain = window.location.hostname;
  const isSubdomain = currentDomain.split('.').length > 2 && 
                     currentDomain.endsWith('.handbok.org') &&
                     currentDomain !== 'www.handbok.org' &&
                     currentDomain !== 'handbok.org';
  
  if (!isSubdomain) return; // Kör bara på subdomäner
  
  console.log('[Resource Fix] Running on subdomain:', currentDomain);
  
  // Extrahera subdomännamnet
  const subdomain = currentDomain.split('.')[0];
  
  // 1. Fixa statiska resurser
  function fixStaticResources() {
    // Alla resurser ska använda huvuddomänen
    document.querySelectorAll('link[href], script[src], img[src]').forEach(el => {
      const attrName = el.hasAttribute('href') ? 'href' : 'src';
      const resourceUrl = el.getAttribute(attrName);
      
      if (resourceUrl && resourceUrl.startsWith('/') && !resourceUrl.startsWith('//')) {
        const mainDomainUrl = 'https://handbok.org' + resourceUrl;
        el.setAttribute(attrName, mainDomainUrl);
      }
    });
  }
  
  // 2. Säker localStorage-åtkomst
  let memoryStorage = {};
  
  window.safeStorage = {
    getItem: function(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('LocalStorage access failed, using memory storage');
        return memoryStorage[key] || null;
      }
    },
    setItem: function(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('LocalStorage access failed, using memory storage');
        memoryStorage[key] = value;
      }
    },
    removeItem: function(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('LocalStorage access failed, using memory storage');
        delete memoryStorage[key];
      }
    }
  };
  
  // Kör när DOM är redo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixStaticResources);
  } else {
    fixStaticResources();
  }
  
  // Observera DOM-ändringar och fixa resurser kontinuerligt
  if (window.MutationObserver) {
    const observer = new MutationObserver(fixStaticResources);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})(); 