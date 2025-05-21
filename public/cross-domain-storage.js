/**
 * Förenklad ersättning för cross-domain storage
 * 
 * Hanterar både direktåtkomst och fallback för localStorage
 * för att lösa problem med "Access to storage is not allowed from this context" i iframes
 */
(function() {
  // Detektera om vi är i en iframe
  const isInIframe = window !== window.parent;
  
  // Kontrollera om vi är på en subdomän
  const currentDomain = window.location.hostname;
  
  // Bestäm om vi är i staging eller produktion
  const isStaging = currentDomain.includes('staging.handbok.org');
  
  // Vi hanterar alla subdomäner likadant
  
  // Undvik omdirigering för API-anrop
  const isApiCall = window.location.pathname.startsWith('/api/');
  
  // Om vi är på en subdomän av handbok.org eller staging.handbok.org
  // och det INTE är ett API-anrop och inte i en iframe
  const isSubdomain = (currentDomain.endsWith('handbok.org') && currentDomain !== 'handbok.org' && currentDomain !== 'staging.handbok.org');
  
  // Skapa en memory-baserad localStorage-ersättning
  const memoryStorage = {};
  
  // Fixa API-anrop som använder user_id istället för owner_id
  // Detta är en patch för att fånga upp klientsidans requests innan de når servern
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    // Hantera URL:er som strings eller Request-objekt
    let url = input;
    if (input instanceof Request) {
      url = input.url;
    }
    
    // Om URL:en innehåller user_id=eq, ändra det till owner_id=eq
    if (typeof url === 'string' && url.includes('user_id=eq')) {
      url = url.replace('user_id=eq', 'owner_id=eq');
      if (input instanceof Request) {
        // Skapa en ny Request med den ändrade URL:en
        const newRequest = new Request(url, input);
        return originalFetch(newRequest, init);
      } else {
        // Använd den ändrade URL:en direkt
        return originalFetch(url, init);
      }
    }
    
    // För alla andra anrop, skicka vidare till original fetch
    return originalFetch(input, init);
  };
  
  // Skapa safe storage for både vanlig och iframe-användning
  const safeStorage = {
    getItem: function(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.log('localStorage error, using memory storage:', e);
        return memoryStorage[key] || null;
      }
    },
    setItem: function(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.log('localStorage error, using memory storage:', e);
        memoryStorage[key] = value;
      }
    },
    removeItem: function(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.log('localStorage error, using memory storage:', e);
        delete memoryStorage[key];
      }
    },
    clear: function() {
      try {
        localStorage.clear();
      } catch (e) {
        console.log('localStorage error, using memory storage:', e);
        Object.keys(memoryStorage).forEach(key => {
          delete memoryStorage[key];
        });
      }
    }
  };
  
  // Tillgängliggör safe storage globalt
  window.safeStorage = safeStorage;
  
  // Om vi behöver redirecta, gör det nu
  if (isSubdomain && !isApiCall && !isInIframe) {
    // Spara nuvarande URL för att kunna återvända
    try {
      safeStorage.setItem('redirect_after_login', window.location.href);
    } catch (e) {
      console.error('Kunde inte spara redirect URL:', e);
    }
  }
})(); 