/**
 * js-fallback.js - Förenklad version
 * 
 * Enkel fallback-lösning för att hantera JavaScript och font-laddningsproblem
 */

(function() {
  const hostname = window.location.hostname;
  
  // Bestäm om vi är i staging eller produktion
  const isStaging = hostname.includes('staging.handbok.org');
  
  // Vi hanterar alla subdomäner likadant
  
  // Undvik omdirigering för API-anrop
  const isApiCall = window.location.pathname.startsWith('/api/');
  if (isApiCall) {
    return; // Skippa omdirigering för API-anrop
  }
  
  // Kontrollera om vi är på en subdomän, men inte staging.handbok.org själv
  if (!(
      (hostname.endsWith('.handbok.org') && 
       hostname !== 'handbok.org' && 
       hostname !== 'www.handbok.org' &&
       hostname !== 'staging.handbok.org') ||
      (hostname.endsWith('.staging.handbok.org') &&
       hostname !== 'staging.handbok.org')
     )) {
    return;
  }
  
  console.log('[JS Fallback] Aktiv på subdomän');
  
  let subdomain;
  let targetDomain;
  
  if (hostname.endsWith('.staging.handbok.org')) {
    // Format: subdomain.staging.handbok.org -> staging.handbok.org/handbook/subdomain
    subdomain = hostname.split('.')[0];
    targetDomain = 'https://staging.handbok.org';
  } else if (isStaging) {
    // Om vi är på staging.handbok.org eller en subdomain direkt under staging.handbok.org
    subdomain = hostname.split('.')[0];
    targetDomain = 'https://staging.handbok.org';
  } else {
    // Format: subdomain.handbok.org -> www.handbok.org/handbook/subdomain
    subdomain = hostname.split('.')[0];
    targetDomain = 'https://www.handbok.org';
  }
  
  // Kommentera ut eller ta bort redirect till /handbook/[subdomain]
  // window.location.href = targetDomain + '/handbook/' + subdomain;
  
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