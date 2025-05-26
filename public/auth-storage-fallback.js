/**
 * Auth Storage Fallback
 * 
 * Detta script ersätter cross-domain-storage.js och tillhandahåller fallback-lagring
 * för autentiseringstoken när localStorage inte är tillgängligt eller ger åtkomstfel.
 */
(function() {
  if (typeof window === 'undefined') return;

  // Skapa memory storage om det inte redan finns
  if (!window.memoryStorage) {
    window.memoryStorage = {};
  }

  // SafeStorage implementering som används av Supabase auth
  if (!window.safeStorage) {
    window.safeStorage = {
      getItem: function(key) {
        try {
          // Försök först med localStorage
          return localStorage.getItem(key);
        } catch (e) {
          console.warn('localStorage access error in getItem:', e);
          // Fallback till memory storage
          return window.memoryStorage[key] || null;
        }
      },
      
      setItem: function(key, value) {
        try {
          // Försök först med localStorage
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('localStorage access error in setItem:', e);
          // Fallback till memory storage
          window.memoryStorage[key] = value;
        }
      },
      
      removeItem: function(key) {
        try {
          // Försök först med localStorage
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('localStorage access error in removeItem:', e);
          // Fallback till memory storage
          delete window.memoryStorage[key];
        }
      }
    };
  }

  // Bevaka om cookies förloras i subdomains (vanligt problem)
  function checkAndRefreshAuth() {
    try {
      // Kontrollera om vi har cookies men inte tokens
      const hasCookies = document.cookie.includes('sb-');
      
      // Kontrollera om vi har localStorage token
      const hasTokenInStorage = (
        !!window.safeStorage.getItem('sb-refresh-token') || 
        !!window.safeStorage.getItem('supabase.auth.token')
      );
      
      // Kontrollera om vi har haft för många misslyckade refresh-försök
      const refreshFailCount = parseInt(window.safeStorage.getItem('sb-refresh-fail-count') || '0');
      const lastRefreshFail = parseInt(window.safeStorage.getItem('sb-last-refresh-fail') || '0');
      const timeSinceLastFail = Date.now() - lastRefreshFail;
      
      // Om vi har haft för många misslyckanden nyligen, rensa allt
      if (refreshFailCount >= 3 && timeSinceLastFail < 60000) { // 1 minut
        console.log('För många refresh-fel, rensar auth data');
        clearAllAuthData();
        return;
      }
      
      // Debug info
      if (localStorage.getItem('debug_auth') === 'true') {
        console.log('Auth check:', { 
          hasCookies, 
          hasTokenInStorage, 
          refreshFailCount,
          timeSinceLastFail 
        });
      }
      
      // Om vi har cookies men inte tokens, försök få tokens från API
      if (hasCookies && !hasTokenInStorage && refreshFailCount < 3) {
        console.log('Har cookies men inga tokens, försöker hämta session...');
        
        // Trigga en session-refresh från Supabase
        if (window.supabase && window.supabase.auth) {
          window.supabase.auth.getSession().catch(e => {
            console.warn('Kunde inte hämta session:', e);
            
            // Räkna upp misslyckanden
            const newFailCount = refreshFailCount + 1;
            window.safeStorage.setItem('sb-refresh-fail-count', newFailCount.toString());
            window.safeStorage.setItem('sb-last-refresh-fail', Date.now().toString());
            
            // Om vi nått max antal försök, rensa allt
            if (newFailCount >= 3) {
              console.log('Max refresh-försök nått, rensar auth data');
              clearAllAuthData();
            }
          });
        }
      }
    } catch (e) {
      console.warn('Fel vid auth-kontroll:', e);
    }
  }
  
  // Funktion för att rensa all auth-relaterad data
  function clearAllAuthData() {
    try {
      // Rensa localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // Rensa cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.handbok.org`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
      
      // Rensa memory storage
      if (window.memoryStorage) {
        Object.keys(window.memoryStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            delete window.memoryStorage[key];
          }
        });
      }
      
      console.log('Auth data cleared');
    } catch (e) {
      console.warn('Error clearing auth data:', e);
    }
  }
  
  // Kör en kontroll direkt och sedan var 30:e sekund
  setTimeout(checkAndRefreshAuth, 1000);
  setInterval(checkAndRefreshAuth, 30000);
  
  // Exponera funktioner globalt för användning av andra delar av appen
  window.authStorageFallback = {
    clearAllAuthData: clearAllAuthData,
    resetFailureCount: function() {
      try {
        window.safeStorage.removeItem('sb-refresh-fail-count');
        window.safeStorage.removeItem('sb-last-refresh-fail');
        console.log('Auth failure count reset');
      } catch (e) {
        console.warn('Error resetting failure count:', e);
      }
    }
  };
  
  console.log('Auth storage fallback initialized');
})(); 