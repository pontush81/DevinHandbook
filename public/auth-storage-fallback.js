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
      
      // Debug info
      if (localStorage.getItem('debug_auth') === 'true') {
        console.log('Auth check:', { hasCookies, hasTokenInStorage });
      }
      
      // Om vi har cookies men inte tokens, försök få tokens från API
      if (hasCookies && !hasTokenInStorage) {
        console.log('Har cookies men inga tokens, försöker hämta session...');
        
        // Trigga en session-refresh från Supabase
        if (window.supabase && window.supabase.auth) {
          window.supabase.auth.getSession().catch(e => {
            console.warn('Kunde inte hämta session:', e);
          });
        }
      }
    } catch (e) {
      console.warn('Fel vid auth-kontroll:', e);
    }
  }
  
  // Kör en kontroll direkt och sedan var 30:e sekund
  setTimeout(checkAndRefreshAuth, 1000);
  setInterval(checkAndRefreshAuth, 30000);
  
  console.log('Auth storage fallback initialized');
})(); 