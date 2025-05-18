/**
 * js-fallback.js - Förenklad version
 * 
 * Enkel fallback-lösning för att hantera JavaScript och font-laddningsproblem
 */

(function() {
  // Om vi inte är på en subdomän, avsluta direkt
  const hostname = window.location.hostname;
  if (!(hostname.endsWith('.handbok.org') && 
       hostname !== 'handbok.org' && 
       hostname !== 'www.handbok.org' &&
       hostname !== 'staging.handbok.org')) {
    return;
  }
  
  console.log('[JS Fallback] Aktiv på subdomän');
  
  // Bestäm om vi är i staging eller produktion
  const isStaging = hostname.includes('staging.handbok.org') || 
                     hostname.endsWith('.staging.handbok.org');
  
  // 1. Omdirigera direkt till huvuddomänen
  const subdomain = hostname.split('.')[0];
  
  // Välj rätt måldomän baserat på miljö
  const targetDomain = isStaging ? 'https://staging.handbok.org' : 'https://www.handbok.org';
  
  // För alla subdomäner - gå till handboken
  window.location.href = targetDomain + '/handbook/' + subdomain;
  
  // 2. Fixa font-fel om omdirigering misslyckas
  document.addEventListener('DOMContentLoaded', function() {
    // Lägg till font-fallbacks
    const fontFallbackStyle = document.createElement('style');
    fontFallbackStyle.textContent = `
      body, * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      }
      code, pre, .font-mono, [class*="--font-mono"] {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      }
    `;
    document.head.appendChild(fontFallbackStyle);
  });
  
  // 3. Säker localStorage-hantering
  window.safeStorage = {
    getItem: function(key) {
      try { return localStorage.getItem(key); } 
      catch(e) { return null; }
    },
    setItem: function(key, value) {
      try { localStorage.setItem(key, value); } 
      catch(e) { /* ignore */ }
    },
    removeItem: function(key) {
      try { localStorage.removeItem(key); } 
      catch(e) { /* ignore */ }
    }
  };
})(); 