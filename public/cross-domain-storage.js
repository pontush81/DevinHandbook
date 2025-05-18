/**
 * Förenklad ersättning för cross-domain storage
 * 
 * Istället för att använda en iframe för cross-domain storage access, 
 * använder vi en enkel in-memory fallback och omdirigerar för subdomäner.
 */
(function() {
  // Kontrollera om vi är på en subdomän
  const currentDomain = window.location.hostname;
  
  // Bestäm om vi är i staging eller produktion
  const isStaging = currentDomain.includes('staging.handbok.org');
  
  // Handle special case for test.*.handbok.org subdomains
  if (currentDomain.startsWith('test.') && (
      currentDomain.endsWith('.handbok.org') || 
      currentDomain.endsWith('.staging.handbok.org')
  )) {
    // Extract actual subdomain (format: test.subdomain.handbok.org -> subdomain)
    const parts = currentDomain.split('.');
    // For test.subdomain.handbok.org, the actual subdomain is parts[1]
    const subdomain = parts[1];
    
    // Bestäm måldomän baserat på miljö
    const targetDomain = isStaging ? 'https://staging.handbok.org' : 'https://www.handbok.org';
    
    // Redirect to the handbook with the correct path
    window.location.href = targetDomain + '/handbook/' + subdomain;
    return;
  }
  
  // Om vi är på en subdomän av handbok.org eller staging.handbok.org
  if ((currentDomain.endsWith('.handbok.org') && 
       currentDomain !== 'www.handbok.org' && 
       currentDomain !== 'handbok.org' &&
       currentDomain !== 'staging.handbok.org') || 
      (currentDomain.endsWith('.staging.handbok.org'))) {
    
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
    
    // För alla subdomäner - gå till handboken
    window.location.href = targetDomain + '/handbook/' + subdomain;
    return;
  }
  
  // Enkel in-memory lagring som fallback
  const memoryStorage = {};
  
  // Publik API - använd samma interface som localStorage
  window.safeStorage = {
    getItem: function(key) {
      try {
        return localStorage.getItem(key);
      } catch(e) {
        return memoryStorage[key] || null;
      }
    },
    setItem: function(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch(e) {
        memoryStorage[key] = value;
      }
    },
    removeItem: function(key) {
      try {
        localStorage.removeItem(key);
      } catch(e) {
        delete memoryStorage[key];
      }
    },
    clear: function() {
      try {
        localStorage.clear();
      } catch(e) {
        for (let key in memoryStorage) {
          delete memoryStorage[key];
        }
      }
    }
  };
})(); 