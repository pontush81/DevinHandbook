/**
 * js-fallback.js
 * 
 * Detta är en nödfallsfunktion som används när JavaScript-filer inte laddas korrekt
 * på subdomäner. Den försöker åtgärda de vanligaste problemen och tillhandahålla
 * grundläggande funktionalitet.
 * 
 * Version 1.0
 */

(function() {
  console.log('[JS Fallback] Initialiserar JS-fallback för att hantera laddningsproblem');
  
  // Spåra misslyckade skript
  const failedScripts = new Set();
  
  // Hjälpfunktion för att skapa DOM-element
  function createElement(tag, attributes = {}, parent = null) {
    const element = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
    
    if (parent) {
      parent.appendChild(element);
    }
    
    return element;
  }
  
  // Funktion för att ladda om JS-filer via huvuddomänen
  function reloadScript(originalSrc) {
    // Förhindra oändliga omladdningar
    if (failedScripts.has(originalSrc)) {
      console.warn(`[JS Fallback] Skript har redan misslyckats: ${originalSrc}`);
      return;
    }
    
    failedScripts.add(originalSrc);
    
    // Skapa rätt URL till huvuddomänen
    let fixedSrc = originalSrc;
    
    // Om det är en lokal URL, se till att den går till huvuddomänen
    if (originalSrc.startsWith('/')) {
      fixedSrc = `https://handbok.org${originalSrc}`;
    } else if (!originalSrc.includes('//')) {
      fixedSrc = `https://handbok.org/${originalSrc}`;
    }
    
    // Skapa och lägg till skriptet
    const script = createElement('script', {
      src: fixedSrc,
      async: 'true',
      'data-fallback': 'true'
    }, document.head);
    
    console.log(`[JS Fallback] Försöker ladda om skript: ${fixedSrc}`);
    
    // Hantera fel
    script.onerror = function() {
      console.error(`[JS Fallback] Kunde inte ladda: ${fixedSrc}`);
      
      // Försök med API proxy som sista utväg
      const proxyUrl = `/api/resources?path=${encodeURIComponent(originalSrc)}`;
      
      const proxyScript = createElement('script', {
        src: proxyUrl,
        async: 'true',
        'data-proxy-fallback': 'true'
      }, document.head);
      
      console.log(`[JS Fallback] Sista försök med proxy: ${proxyUrl}`);
    };
  }
  
  // Övervaka skriptfel
  window.addEventListener('error', function(event) {
    const target = event.target;
    
    // Kontrollera om det är ett skriptladdningsfel
    if (target && target.tagName === 'SCRIPT' && target.src) {
      const src = target.src;
      
      // Kontrollera om felet är "Unexpected token '<'" genom att inspektera felmeddelandet
      if (event.message && event.message.includes("Unexpected token '<'")) {
        console.warn(`[JS Fallback] Skriptfel detekterat (Unexpected token '<'): ${src}`);
        reloadScript(src);
      }
      // Hantera även 404-fel
      else if (event.message && event.message.includes("404")) {
        console.warn(`[JS Fallback] Skriptfel detekterat (404): ${src}`);
        reloadScript(src);
      }
    }
  }, true);
  
  // Försök att rätta till de rapporterade skripten specifikt
  const specificFailures = [
    'main-app-6cb4d4205dbe6682.js',
    'not-found-c44b5e0471063abc.js',
    '1684-dd509a3db56295d1.js',
    'layout-0c33b245aae4c126.js',
    '851-c6952f3282869f27.js', 
    '6874-19a86d48fe6904b6.js',
    'page-deedaeca2a6f4416.js',
    '4bd1b696-6406cd3a0eb1deaf.js',
    'webpack-59fcb2c1b9dd853e.js',
    '792-f5f0dba6c4a6958b.js'
  ];
  
  // Om vi är på en subdomän, proaktivt försöka ladda om problematiska skript
  const hostname = window.location.hostname;
  if (hostname.endsWith('.handbok.org') && hostname !== 'handbok.org' && hostname !== 'www.handbok.org') {
    console.log('[JS Fallback] Subdomän detekterad, kontrollerar problematiska skript');
    
    specificFailures.forEach(scriptName => {
      const existingScript = document.querySelector(`script[src*="${scriptName}"]`);
      
      if (existingScript) {
        // Skriptet finns redan, men kan vara problematiskt
        console.log(`[JS Fallback] Potentiellt problematiskt skript hittat: ${scriptName}`);
        
        // Skapa en timer för att kontrollera om skriptet misslyckats
        setTimeout(() => {
          // Om vi har ett fel som innehåller detta skriptnamn, försök ladda om det
          if (window.jsErrorsDetected && window.jsErrorsDetected[scriptName]) {
            console.log(`[JS Fallback] Försöker åtgärda: ${scriptName}`);
            reloadScript(existingScript.src);
          }
        }, 1000);
      }
    });
    
    // Skapa en global felspårare
    window.jsErrorsDetected = {};
    
    // Lyssna efter specifika syntaxfel som kan indikera misslyckade skript
    window.addEventListener('error', function(event) {
      if (event.message && event.message.includes("Unexpected token '<'")) {
        // Extrahera filnamn från URL om tillgängligt
        const filename = event.filename ? event.filename.split('/').pop() : 'unknown';
        window.jsErrorsDetected[filename] = true;
      }
    });
  }
  
  console.log('[JS Fallback] Initialisering klar');
})(); 