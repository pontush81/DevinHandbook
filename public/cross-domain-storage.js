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
  // och det INTE är ett API-anrop och inte är huvuddomänerna
  if (!isApiCall && ((currentDomain.endsWith('.handbok.org') && 
       currentDomain !== 'www.handbok.org' && 
       currentDomain !== 'handbok.org' &&
       currentDomain !== 'staging.handbok.org') || 
      (currentDomain.endsWith('.staging.handbok.org') &&
       currentDomain !== 'staging.handbok.org'))) {
    
    let subdomain;
    let targetDomain;
    
    if (currentDomain.endsWith('.staging.handbok.org')) {
      // Format: subdomain.staging.handbok.org -> staging.handbok.org/handbook/subdomain
      subdomain = currentDomain.split('.')[0];
      targetDomain = 'https://staging.handbok.org';
    } else if (isStaging) {
      // Om vi är på staging.handbok.org eller en subdomain direkt under staging.handbok.org
      subdomain = currentDomain.split('.')[0];
      targetDomain = 'https://staging.handbok.org';
    } else {
      // Format: subdomain.handbok.org -> www.handbok.org/handbook/subdomain
      subdomain = currentDomain.split('.')[0];
      targetDomain = 'https://www.handbok.org';
    }
    
    // Kommentera ut eller ta bort redirect till /handbook/[subdomain]
    // window.location.href = targetDomain + '/handbook/' + subdomain;
    return;
  }
  
  // Enkel in-memory lagring som fallback
  const memoryStorage = {};
  
  // Kontrollera om localStorage är tillgängligt
  let localStorageAvailable = false;
  try {
    const testKey = '__test_storage__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    localStorageAvailable = true;
  } catch (e) {
    console.warn('localStorage är inte tillgängligt. Använder in-memory lagring istället.', e);
    localStorageAvailable = false;
  }
  
  // Specialhantering för iframe-kontext
  const iframeUnsafe = isInIframe && !localStorageAvailable;
  
  // Logga diagnostik
  if (iframeUnsafe) {
    console.log('Iframe-kontext detekterad utan localStorage-åtkomst. Använder säker fallback.');
  }
  
  // Publik API - använd samma interface som localStorage
  window.safeStorage = {
    getItem: function(key) {
      if (localStorageAvailable) {
        try {
          return localStorage.getItem(key);
        } catch(e) {
          console.warn('Kunde inte läsa från localStorage:', e);
          return memoryStorage[key] || null;
        }
      }
      return memoryStorage[key] || null;
    },
    setItem: function(key, value) {
      if (localStorageAvailable) {
        try {
          localStorage.setItem(key, value);
          // Synka även till minnet för konsistens
          memoryStorage[key] = value;
          return;
        } catch(e) {
          console.warn('Kunde inte skriva till localStorage:', e);
        }
      }
      memoryStorage[key] = value;
    },
    removeItem: function(key) {
      if (localStorageAvailable) {
        try {
          localStorage.removeItem(key);
        } catch(e) {
          console.warn('Kunde inte ta bort från localStorage:', e);
        }
      }
      delete memoryStorage[key];
    },
    clear: function() {
      if (localStorageAvailable) {
        try {
          localStorage.clear();
        } catch(e) {
          console.warn('Kunde inte rensa localStorage:', e);
        }
      }
      
      // Rensa minnet
      for (let key in memoryStorage) {
        delete memoryStorage[key];
      }
    }
  };
  
  // Sätt upp synonymer för bakåtkompatibilitet
  window.safeLocalStorage = window.safeStorage;
  
  // Rapportera status för diagnostik
  console.log('Säker lagringshantering initierad. localStorage ' + 
    (localStorageAvailable ? 'tillgänglig' : 'otillgänglig') + 
    (isInIframe ? ' (iframe-kontext)' : ''));
})(); 