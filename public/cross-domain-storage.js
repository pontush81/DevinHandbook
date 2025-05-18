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
  const isStaging = currentDomain.includes('staging.handbok.org') || 
                   currentDomain.endsWith('.staging.handbok.org');
  
  if (currentDomain.endsWith('.handbok.org') && 
      currentDomain !== 'www.handbok.org' && 
      currentDomain !== 'handbok.org' &&
      currentDomain !== 'staging.handbok.org') {
    
    // Hämta subdomänen och omdirigera till handboken
    const subdomain = currentDomain.split('.')[0];
    
    // Välj rätt måldomän baserat på miljö
    const targetDomain = isStaging ? 'https://staging.handbok.org' : 'https://www.handbok.org';
    
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