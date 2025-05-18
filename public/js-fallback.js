/**
 * js-fallback.js - Förenklad version
 * 
 * Enkel fallback-lösning för att hantera JavaScript och font-laddningsproblem
 */

(function() {
  const hostname = window.location.hostname;
  
  // Bestäm om vi är i staging eller produktion
  const isStaging = hostname.includes('staging.handbok.org');
  
  // Handle special case for test.*.handbok.org subdomains
  if (hostname.startsWith('test.') && (
      hostname.endsWith('.handbok.org') || 
      hostname.endsWith('.staging.handbok.org')
  )) {
    // Extract actual subdomain (format: test.subdomain.handbok.org -> subdomain)
    const parts = hostname.split('.');
    // For test.subdomain.handbok.org, the actual subdomain is parts[1]
    const subdomain = parts[1];
    
    // Bestäm måldomän baserat på miljö
    const targetDomain = isStaging ? 'https://staging.handbok.org' : 'https://www.handbok.org';
    
    // Redirect to the handbook with the correct path
    window.location.href = targetDomain + '/handbook/' + subdomain;
    return;
  }
  
  // Kontrollera om vi är på en subdomän
  if (!(
      (hostname.endsWith('.handbok.org') && 
       hostname !== 'handbok.org' && 
       hostname !== 'www.handbok.org' &&
       hostname !== 'staging.handbok.org') ||
      (hostname.endsWith('.staging.handbok.org'))
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