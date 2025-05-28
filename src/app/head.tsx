export default function Head() {
  return (
    <>
      <title>Handbok.org - Digital handbok för bostadsrättsföreningar</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charSet="utf-8" />
      <meta name="description" content="Skapa en digital handbok för din bostadsrättsförening" />
      <meta property="og:title" content="Handbok.org - Digital handbok för bostadsrättsföreningar" />
      <meta property="og:description" content="Skapa en digital handbok för din bostadsrättsförening" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://handbok.org" />
      <meta property="og:image" content="https://handbok.org/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Handbok.org - Digital handbok för bostadsrättsföreningar" />
      <meta name="twitter:description" content="Skapa en digital handbok för din bostadsrättsförening" />
      <meta name="twitter:image" content="https://handbok.org/og-image.png" />
      
      {/* Nödfalls-CSS som laddas direkt i head */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Grundläggande stilar som garanterat laddas */
        body {
          font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
          line-height: 1.5;
          color: #333;
          margin: 0;
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        a { color: #2563eb; }
        h1, h2, h3 { color: #111; font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif; }
        
        /* Stilar för de vanligaste komponenterna */
        button, .btn, input[type="button"], input[type="submit"] {
          background-color: #2563eb;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
        }
        input, textarea, select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 0.25rem;
          width: 100%;
          max-width: 30rem;
          font-family: 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
        }
        
        /* Hjälpklasser för layout */
        .flex { display: flex; }
        .grid { display: grid; }
        .container { max-width: 1200px; margin: 0 auto; }
        .p-4 { padding: 1rem; }
        .mt-4 { margin-top: 1rem; }
        .mb-4 { margin-bottom: 1rem; }
      `}} />
      
      {/* Fix för fontproblem och redirects */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          // Hjälpfunktion för att skapa en enkel font-face deklaration
          function createFontFace(family, filename, weight, style) {
            var style = document.createElement('style');
            style.textContent = \`
              @font-face {
                font-family: '\${family}';
                font-style: \${style || 'normal'};
                font-weight: \${weight || 400};
                font-display: swap;
                src: local('Arial');
              }
            \`;
            document.head.appendChild(style);
          }
          
          // Lägg till systemfonter som fallback för Geist
          createFontFace('Geist', 'geist', 400);
          createFontFace('Geist', 'geist', 700);
          createFontFace('Geist Mono', 'geist-mono', 400);
          
          // Hantera redirect-loopar för statiska resurser
          try {
            // Kontrollera förekomst av redirect-loopar
            var redirectCount = parseInt(sessionStorage.getItem('resource_redirect_count') || '0');
            if (redirectCount > 3) {
              console.warn('För många omdirigeringar detekterade - använder nödläge');
              // Reset redirect counter
              sessionStorage.setItem('resource_redirect_count', '0');
            } else {
              // Öka räknare vid sidladdning
              sessionStorage.setItem('resource_redirect_count', (redirectCount + 1).toString());
              
              // Återställ efter 3 sekunder om inga problem
              setTimeout(function() {
                sessionStorage.setItem('resource_redirect_count', '0');
              }, 3000);
            }
          } catch(e) {
            console.warn('Kunde inte hantera sessionStorage:', e);
          }
          
          // Safe localStorage implementation
          if (typeof window !== 'undefined') {
            // Test localStorage access once at startup with caching
            let localStorageAvailable = false;
            let hasBeenTested = false;
            
            const testLocalStorage = () => {
              if (hasBeenTested) return localStorageAvailable;
              hasBeenTested = true;
              
              try {
                const testKey = '__head_ls_test__';
                window.localStorage.setItem(testKey, 'test');
                window.localStorage.removeItem(testKey);
                localStorageAvailable = true;
              } catch(e) {
                localStorageAvailable = false;
              }
              return localStorageAvailable;
            };
            
            window.safeStorage = {
              getItem: function(key) {
                if (!testLocalStorage()) return null;
                try { 
                  return window.localStorage.getItem(key); 
                } catch(e) { 
                  return null; 
                }
              },
              setItem: function(key, value) {
                if (!testLocalStorage()) return;
                try { 
                  window.localStorage.setItem(key, value); 
                } catch(e) { 
                  /* silently fail */ 
                }
              },
              removeItem: function(key) {
                if (!testLocalStorage()) return;
                try { 
                  window.localStorage.removeItem(key); 
                } catch(e) { 
                  /* silently fail */ 
                }
              }
            };
            
            // Memory storage fallback
            window.memoryStorage = {};
          }
          
          // Fixa resursomskrivningar för att förhindra loops
          var isSubdomain = window.location.hostname.endsWith('.handbok.org') && 
                           window.location.hostname !== 'handbok.org' &&
                           window.location.hostname !== 'www.handbok.org';
          if (isSubdomain) {
            Array.from(document.querySelectorAll('link[href^="/_next/"], script[src^="/_next/"]')).forEach(function(el) {
              var attr = el.hasAttribute('href') ? 'href' : 'src';
              var value = el.getAttribute(attr);
              if (value) {
                el.setAttribute(attr, 'https://handbok.org' + value);
              }
            });
          }
        })();
      `}} />
    </>
  );
} 