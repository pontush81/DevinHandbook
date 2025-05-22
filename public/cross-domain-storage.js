/**
 * Förbättrad ersättning för cross-domain storage
 * 
 * Hanterar både direktåtkomst och fallback för localStorage
 * för att lösa problem med "Access to storage is not allowed from this context" i iframes
 * och på subdomäner som pontus.handbok.org
 */
(function() {
  // Prioritera att köra denna kod omedelbart, innan alla andra skript
  try {
    // Undvik körning flera gånger
    if (window.__crossDomainStorageInitialized) {
      console.log('Cross-domain storage already initialized');
      return;
    }
    window.__crossDomainStorageInitialized = true;

    // Detektera om vi är i en iframe
    const isInIframe = window !== window.parent;
    
    // Kontrollera om vi är på en subdomän
    const currentDomain = window.location.hostname;
    const mainDomain = 'handbok.org';
    
    // Bestäm om vi är i staging eller produktion
    const isStaging = currentDomain.includes('staging.handbok.org');
    
    // Kontrollera om vi är på en subdomän av handbok.org
    const isSubdomain = (
      currentDomain.endsWith(mainDomain) && 
      currentDomain !== mainDomain && 
      currentDomain !== 'staging.handbok.org' && 
      currentDomain !== 'www.handbok.org'
    );
    
    // Undvik omdirigering för API-anrop
    const isApiCall = window.location.pathname.startsWith('/api/');
    
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
      } else {
        localStorageBlocked = true;
        console.warn('localStorage är inte tillgänglig i denna kontext');
      }
    } catch (e) {
      console.warn('localStorage är blockerad i denna kontext:', e);
      localStorageBlocked = true;
    }
    
    // Säkrare localStorage-åtkomst med memory fallback
    const safeStorage = {
      getItem: function(key) {
        if (!key) return null;
        
        // Försök först hämta från memory storage
        if (memoryStorage[key] !== undefined) {
          return memoryStorage[key];
        }
        
        // Sedan försök med localStorage om det är tillgängligt
        if (!localStorageBlocked) {
          try {
            if (typeof localStorage !== 'undefined') {
              const value = localStorage.getItem(key);
              if (value !== null && value !== undefined) {
                // Verifiera att vi fick ett giltigt värde och cache'a det
                memoryStorage[key] = value;
                return value;
              }
            }
          } catch (e) {
            console.warn('Kunde inte hämta från localStorage:', e);
            // Markera som blockerad för framtida anrop
            localStorageBlocked = true;
          }
        }
        
        return null;
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
              return true;
            }
          } catch (e) {
            console.warn('Kunde inte spara i localStorage:', e);
            // Markera som blockerad för framtida anrop
            localStorageBlocked = true;
          }
        }
        
        // Även om localStorage är blockerad så lyckades vi spara i memory
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
            // Markera som blockerad för framtida anrop
            localStorageBlocked = true;
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
            // Markera som blockerad för framtida anrop
            localStorageBlocked = true;
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
          if (typeof sessionJson === 'string') {
            JSON.parse(sessionJson); // Kastar fel om ogiltig JSON
          }
          
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
          safeStorage.removeItem('sb-provider-token');
          
          return true;
        } catch (e) {
          console.error('Fel vid rensning av session:', e);
          return false;
        }
      }
    };
    
    // Monkeypatch fetch för att hantera autentisering
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      try {
        const [resource, options = {}] = args;
        const url = resource.toString();
        
        // Modifiera anrop till auth-endpoints för att hantera CORS
        if (url.includes('/auth/') || url.includes('/auth.') || url.includes('/token')) {
          if (!options.headers) {
            options.headers = new Headers();
          }
          
          // Endast för subdomäner, lägg till CORS-headers
          if (isSubdomain) {
            if (options.headers instanceof Headers) {
              if (!options.headers.has('X-Client-Info')) {
                options.headers.set('X-Client-Info', 'supabase-js/2.0.0');
              }
            } else {
              options.headers = {
                ...options.headers,
                'X-Client-Info': 'supabase-js/2.0.0'
              };
            }
          }
        }
        
        return originalFetch(resource, options);
      } catch (e) {
        console.error('Fel vid anpassad fetch:', e);
        return originalFetch(...args);
      }
    };
    
    // Polyfilla localStorage och sessionStorage globalt för att hantera blockering
    if (localStorageBlocked) {
      try {
        // Ersätt blockerad localStorage med vår säkra implementation
        if (!Object.getOwnPropertyDescriptor(window, 'localStorage') || 
            Object.getOwnPropertyDescriptor(window, 'localStorage').configurable) {
          Object.defineProperty(window, 'localStorage', {
            value: {
              getItem: safeStorage.getItem,
              setItem: safeStorage.setItem,
              removeItem: safeStorage.removeItem,
              clear: safeStorage.clear,
              length: 0, // Simulerar standardegenskaper
              key: function() { return null; } // Dummy implementation
            },
            writable: false,
            configurable: true
          });
        }
        
        // Gör samma sak för sessionStorage om den också är blockerad
        if (!Object.getOwnPropertyDescriptor(window, 'sessionStorage') || 
            Object.getOwnPropertyDescriptor(window, 'sessionStorage').configurable) {
          Object.defineProperty(window, 'sessionStorage', {
            value: {
              getItem: safeStorage.getItem,
              setItem: safeStorage.setItem,
              removeItem: safeStorage.removeItem,
              clear: safeStorage.clear,
              length: 0,
              key: function() { return null; }
            },
            writable: false,
            configurable: true
          });
        }
        
        console.log('Ersatt blockerad localStorage/sessionStorage med memory-baserad implementation');
      } catch (e) {
        console.error('Kunde inte ersätta blockerad storage:', e);
      }
    }
    
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
      domain: currentDomain,
      isLocalStorageBlocked: localStorageBlocked
    });
    
    // Fallback DOM storage API för kompatibilitet
    document.addEventListener('DOMContentLoaded', function() {
      if (localStorageBlocked) {
        try {
          // Skapa en hidden iframe för att kommunicera med huvuddomänen
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.src = `https://${isStaging ? 'staging.' : ''}handbok.org/storage-bridge.html`;
          document.body.appendChild(iframe);
          
          // Lyssna på meddelanden från iframe
          window.addEventListener('message', function(event) {
            if (event.origin === `https://${isStaging ? 'staging.' : ''}handbok.org`) {
              try {
                const data = JSON.parse(event.data);
                if (data.type === 'storage-bridge-ready') {
                  console.log('Storage bridge ready');
                } else if (data.type === 'storage-get-response') {
                  // Hantera svar från storage bridge
                  memoryStorage[data.key] = data.value;
                }
              } catch (e) {
                console.error('Fel vid hantering av storage bridge:', e);
              }
            }
          });
        } catch (e) {
          console.error('Kunde inte skapa storage bridge:', e);
        }
      }
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
  } catch (e) {
    console.error('Kritiskt fel i cross-domain-storage.js:', e);
  }
})(); 