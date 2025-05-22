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
  
  // Kontrollera om vi är i en 3rd-party kontext där localStorage är blockerad
  let localStorageBlocked = false;
  try {
    // Testa om localStorage är tillgänglig
    if (typeof localStorage !== 'undefined') {
      const testKey = '__test_storage_access__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    }
  } catch (e) {
    console.warn('localStorage är blockerad i denna kontext:', e);
    localStorageBlocked = true;
  }
  
  // Säkrare localStorage-åtkomst med memory fallback
  const safeStorage = {
    getItem: function(key) {
      if (!key) return null;
      
      try {
        if (!localStorageBlocked && typeof localStorage !== 'undefined') {
          const value = localStorage.getItem(key);
          if (value) {
            // Verifiera att vi fick ett giltigt värde
            return value;
          }
        }
      } catch (e) {
        console.warn('Kunde inte hämta från localStorage:', e);
      }
      
      // Använd memory storage som fallback
      return memoryStorage[key] || null;
    },
    
    setItem: function(key, value) {
      if (!key) return false;
      
      // Spara alltid i memory-storage först
      memoryStorage[key] = value;
      
      // Försök sedan spara i localStorage om möjligt
      if (!localStorageBlocked) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
          }
        } catch (e) {
          console.warn('Kunde inte spara i localStorage:', e);
        }
      }
      
      return true;
    },
    
    removeItem: function(key) {
      if (!key) return false;
      
      // Ta alltid bort från memory-storage
      delete memoryStorage[key];
      
      // Försök ta bort från localStorage om möjligt
      if (!localStorageBlocked) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn('Kunde inte ta bort från localStorage:', e);
        }
      }
      
      return true;
    },
    
    clear: function() {
      // Rensa memory-storage
      Object.keys(memoryStorage).forEach(key => {
        delete memoryStorage[key];
      });
      
      // Försök rensa localStorage om möjligt
      if (!localStorageBlocked) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.clear();
          }
        } catch (e) {
          console.warn('Kunde inte rensa localStorage:', e);
        }
      }
    }
  };
  
  // Supabase-specifik storage-wrapper för auth tokens
  const supabaseStorage = {
    getSession: function() {
      try {
        // Hämta token
        const tokenStr = safeStorage.getItem('supabase.auth.token');
        
        // Validera token innan vi returnerar den
        if (tokenStr) {
          try {
            // Verifiera att det är ett giltigt JSON-objekt
            const tokenObj = JSON.parse(tokenStr);
            
            // Kontrollera om token är utgången
            if (tokenObj && tokenObj.expires_at) {
              const expiresAt = new Date(tokenObj.expires_at).getTime();
              const now = Date.now();
              
              // Om token har gått ut, rensa den och returnera null
              if (now >= expiresAt) {
                console.log('Rensade utgången token');
                this.clearSession();
                return null;
              }
            }
            
            return tokenStr;
          } catch (e) {
            console.warn('Ogiltig token-format, rensar:', e);
            this.clearSession();
            return null;
          }
        }
        
        return null;
      } catch (e) {
        console.error('Fel vid hämtning av session:', e);
        return null;
      }
    },
    
    setSession: function(sessionJson) {
      if (!sessionJson) return false;
      
      try {
        // Validera att det är ett giltigt JSON-objekt
        const sessionObj = JSON.parse(sessionJson);
        
        // Spara sessionen
        safeStorage.setItem('supabase.auth.token', sessionJson);
        safeStorage.setItem('supabase.auth.token.timestamp', Date.now().toString());
        
        return true;
      } catch (e) {
        console.error('Ogiltigt sessionsobjekt:', e);
        return false;
      }
    },
    
    clearSession: function() {
      try {
        safeStorage.removeItem('supabase.auth.token');
        safeStorage.removeItem('supabase.auth.token.timestamp');
        
        // Rensa även eventuella cachade versioner av auth-data
        safeStorage.removeItem('sb-refresh-token');
        safeStorage.removeItem('sb-access-token');
        safeStorage.removeItem('sb-auth-token');
        
        return true;
      } catch (e) {
        console.error('Fel vid rensning av session:', e);
        return false;
      }
    }
  };
  
  // Tillgängliggör safe storage globalt
  window.safeStorage = safeStorage;
  window.supabaseStorage = supabaseStorage;
  
  // Om vi behöver redirecta, gör det nu
  if (isSubdomain && !isApiCall && !isInIframe) {
    // Spara nuvarande URL för att kunna återvända
    try {
      safeStorage.setItem('redirect_after_login', window.location.href);
    } catch (e) {
      console.error('Kunde inte spara redirect URL:', e);
    }
  }
  
  // Logga initialisering för felsökning
  console.log('Cross-domain storage initialized:', { 
    isInIframe,
    isSubdomain,
    isLocalStorageBlocked: localStorageBlocked
  });
  
  // Periodiskt kontrollera och rensa utgångna tokens
  setInterval(function() {
    try {
      const tokenStr = safeStorage.getItem('supabase.auth.token');
      if (tokenStr) {
        try {
          const tokenObj = JSON.parse(tokenStr);
          
          // Kontrollera om token är utgången
          if (tokenObj && tokenObj.expires_at) {
            const expiresAt = new Date(tokenObj.expires_at).getTime();
            const now = Date.now();
            
            // Om token har gått ut, rensa den
            if (now >= expiresAt) {
              console.log('Autorensar utgången token');
              supabaseStorage.clearSession();
            }
          }
        } catch (e) {
          // Om token är i ogiltigt format, rensa den
          console.warn('Ogiltig token-format vid kontroll, rensar:', e);
          supabaseStorage.clearSession();
        }
      }
    } catch (e) {
      console.error('Fel vid kontroll av token:', e);
    }
  }, 60000); // Kontrollera varje minut
})(); 